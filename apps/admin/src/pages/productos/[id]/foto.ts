import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getProductForAdmin, setProductImage } from "@falco/db";
import { conAviso } from "../../../avisos";
import { claveDeFoto, pareceImagen, validarFoto } from "../../../fotos";

/** Borrar del bucket no puede tirar abajo un guardado que ya salió bien. */
const borrarSinRomper = async (clave: string) => {
  try {
    await env.PHOTOS.delete(clave);
  } catch (error) {
    console.error("No se pudo borrar la foto vieja de R2", clave, error);
  }
};

/**
 * Sube (o quita) la foto de un producto. La guarda en R2 con una clave que
 * cambia con el contenido, apunta el producto a esa clave y borra la foto
 * anterior. Responde con una redirección a la ficha, con el aviso.
 */
export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return redirect("/productos", 303);
  const ficha = `/productos/${id}`;
  const form = await request.formData();

  if (form.get("accion") === "quitar") {
    const r = await setProductImage(env.DB, id, null, locals.email);
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

  const clave = await claveDeFoto(id, bytes, archivo.type);
  await env.PHOTOS.put(clave, bytes, { httpMetadata: { contentType: archivo.type } });

  const r = await setProductImage(env.DB, id, clave, locals.email).catch(() => undefined);
  if (!r?.ok) {
    // No quedó guardada: la foto recién subida no le sirve a nadie, salvo que
    // otra pestaña haya subido justo la misma (misma clave) y esté en uso.
    const actual = await getProductForAdmin(env.DB, id).catch(() => undefined);
    if (actual?.imageKey !== clave) await borrarSinRomper(clave);
    if (!actual) return redirect("/productos", 303);
    return redirect(conAviso(ficha, "foto-error", r?.reason ?? "No se pudo guardar la foto."), 303);
  }
  if (r.previousKey && r.previousKey !== clave) await borrarSinRomper(r.previousKey);
  return redirect(conAviso(ficha, "foto"), 303);
};
