import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { setInstagramPostImage } from "@falco/db";
import { conAviso } from "../../avisos";
import { claveDeFoto, pareceImagen, validarFoto } from "../../fotos";
import { borrarSinRomper } from "../../subir-foto";

/**
 * La foto de la publicación de Instagram de la home. Igual que la de un
 * producto (subir-foto.ts), pero es una sola y vive en los ajustes, no en una
 * ficha con id.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const error = (texto: string) =>
    redirect(conAviso("/ajustes", "foto-error", texto), 303);

  if (form.get("accion") === "quitar") {
    const r = await setInstagramPostImage(env.DB, null, locals.email);
    if (r.ok && r.previousKey) await borrarSinRomper(r.previousKey);
    return redirect(conAviso("/ajustes", "foto-quitada"), 303);
  }

  const archivo = form.get("foto");
  if (!(archivo instanceof File)) return error("No llegó ninguna foto.");
  const problema = validarFoto(archivo.type, archivo.size);
  if (problema) return error(problema);

  const bytes = await archivo.arrayBuffer();
  if (!pareceImagen(bytes, archivo.type))
    return error("Ese archivo no es una foto.");

  const clave = await claveDeFoto("instagram", 1, bytes, archivo.type);
  await env.PHOTOS.put(clave, bytes, {
    httpMetadata: { contentType: archivo.type },
  });

  const r = await setInstagramPostImage(env.DB, clave, locals.email).catch(
    (e: unknown) => {
      console.error(
        "No se pudo guardar la foto de Instagram en la base",
        clave,
        e,
      );
      return undefined;
    },
  );
  if (!r?.ok) {
    await borrarSinRomper(clave);
    return error("No se pudo guardar la foto.");
  }
  if (r.previousKey && r.previousKey !== clave)
    await borrarSinRomper(r.previousKey);
  return redirect(conAviso("/ajustes", "foto"), 303);
};
