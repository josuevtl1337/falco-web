import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { setProductImage } from "@falco/db";
import { conAviso } from "../../../avisos";
import { claveDeFoto, validarFoto } from "../../../fotos";

/**
 * Sube (o quita) la foto de un producto. La guarda en R2 con una clave que
 * cambia con el contenido, apunta el producto a esa clave y borra la foto
 * anterior. Responde con una redirección a la ficha, con el aviso.
 */
export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const id = Number(params.id);
  const ficha = `/productos/${id}`;
  const form = await request.formData();

  if (form.get("accion") === "quitar") {
    const r = await setProductImage(env.DB, id, null, locals.email);
    if (r.ok && r.previousKey) await env.PHOTOS.delete(r.previousKey);
    return redirect(conAviso(ficha, "foto-quitada"), 303);
  }

  const archivo = form.get("foto");
  if (!(archivo instanceof File)) return redirect(conAviso(ficha, "foto-error", "No llegó ninguna foto."), 303);
  const problema = validarFoto(archivo.type, archivo.size);
  if (problema) return redirect(conAviso(ficha, "foto-error", problema), 303);

  const bytes = await archivo.arrayBuffer();
  const clave = await claveDeFoto(id, bytes, archivo.type);
  await env.PHOTOS.put(clave, bytes, { httpMetadata: { contentType: archivo.type } });

  const r = await setProductImage(env.DB, id, clave, locals.email);
  if (!r.ok) {
    // El producto ya no existe: la foto recién subida no le sirve a nadie.
    await env.PHOTOS.delete(clave);
    return redirect("/productos", 303);
  }
  if (r.previousKey && r.previousKey !== clave) await env.PHOTOS.delete(r.previousKey);
  return redirect(conAviso(ficha, "foto"), 303);
};
