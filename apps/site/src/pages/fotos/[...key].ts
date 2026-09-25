import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";

/**
 * Las fotos de los productos, desde R2. La clave cambia con cada foto (lleva
 * el hash del contenido), así que se puede cachear para siempre: una foto
 * nueva es otra dirección. Sólo se sirve lo que está en productos/.
 */
export const GET: APIRoute = async ({ params }) => {
  const key = params.key ?? "";
  if (!/^productos\/[\w-]+\.(webp|jpg)$/.test(key)) return new Response(null, { status: 404 });

  const foto = await env.PHOTOS.get(key);
  if (!foto) return new Response(null, { status: 404, headers: { "cache-control": "no-store" } });

  return new Response(foto.body, {
    headers: {
      "content-type": foto.httpMetadata?.contentType ?? "image/webp",
      "cache-control": "public, max-age=31536000, immutable",
      // Que el navegador no adivine otro tipo: se sirve como imagen y punto.
      "x-content-type-options": "nosniff",
      etag: foto.httpEtag,
    },
  });
};
