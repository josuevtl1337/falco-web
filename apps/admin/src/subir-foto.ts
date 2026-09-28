import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import type { MutationResult } from "@falco/db";
import { conAviso } from "./avisos";
import { claveDeFoto, pareceImagen, validarFoto, type CarpetaDeFotos } from "./fotos";

type Opciones = {
  carpeta: CarpetaDeFotos;
  /** A dónde volver si la ficha ya no existe. */
  lista: string;
  /** Guarda la clave nueva (o null) y devuelve la anterior. */
  guardar: (
    id: number,
    clave: string | null,
    quien: string,
  ) => Promise<MutationResult<{ previousKey: string | null }>>;
  /** La clave que tiene ahora; `undefined` si la ficha ya no existe. */
  claveActual: (id: number) => Promise<{ imageKey?: string } | undefined>;
};

/** Borrar del bucket no puede tirar abajo un guardado que ya salió bien. */
export const borrarSinRomper = async (clave: string): Promise<void> => {
  try {
    await env.PHOTOS.delete(clave);
  } catch (error) {
    console.error("No se pudo borrar la foto vieja de R2", clave, error);
  }
};

/**
 * Sube (o quita) la foto de una ficha, sea un producto o un café de tolva. La
 * guarda en R2 con una clave que cambia con el contenido, apunta la ficha a
 * esa clave y borra la foto anterior. Responde con una redirección a la
 * ficha, con el aviso.
 */
export const rutaDeFoto =
  ({ carpeta, lista, guardar, claveActual }: Opciones): APIRoute =>
  async ({ params, request, locals, redirect }) => {
    const id = Number(params.id);
    if (!Number.isInteger(id) || id <= 0) return redirect(lista, 303);
    const ficha = `${lista}/${id}`;
    const form = await request.formData();

    if (form.get("accion") === "quitar") {
      const r = await guardar(id, null, locals.email);
      if (!r.ok) return redirect(conAviso(ficha, "foto-error", r.reason ?? "No se pudo quitar la foto."), 303);
      if (r.previousKey) await borrarSinRomper(r.previousKey);
      return redirect(conAviso(ficha, "foto-quitada"), 303);
    }

    const archivo = form.get("foto");
    if (!(archivo instanceof File)) return redirect(conAviso(ficha, "foto-error", "No llegó ninguna foto."), 303);
    const problema = validarFoto(archivo.type, archivo.size);
    if (problema) return redirect(conAviso(ficha, "foto-error", problema), 303);

    const bytes = await archivo.arrayBuffer();
    if (!pareceImagen(bytes, archivo.type))
      return redirect(conAviso(ficha, "foto-error", "Ese archivo no es una foto."), 303);

    const clave = await claveDeFoto(carpeta, id, bytes, archivo.type);
    await env.PHOTOS.put(clave, bytes, { httpMetadata: { contentType: archivo.type } });

    const r = await guardar(id, clave, locals.email).catch((error: unknown) => {
      // Un error de la base (por ejemplo, una migración sin aplicar en local)
      // queda en el log; a la persona le llega el mensaje de siempre.
      console.error("No se pudo guardar la foto en la base", clave, error);
      return undefined;
    });
    if (!r?.ok) {
      // No quedó guardada: la foto recién subida no le sirve a nadie, salvo que
      // otra pestaña haya subido justo la misma (misma clave) y esté en uso.
      const actual = await claveActual(id).catch(() => undefined);
      if (actual?.imageKey !== clave) await borrarSinRomper(clave);
      if (!actual) return redirect(lista, 303);
      return redirect(conAviso(ficha, "foto-error", r?.reason ?? "No se pudo guardar la foto."), 303);
    }
    if (r.previousKey && r.previousKey !== clave) await borrarSinRomper(r.previousKey);
    return redirect(conAviso(ficha, "foto"), 303);
  };
