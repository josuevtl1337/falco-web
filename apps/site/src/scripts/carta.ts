/**
 * La respuesta de /carta, la dirección impresa en los QR de las mesas.
 *
 * 302 y no 301: un 301 queda guardado en el navegador de quien escaneó el QR,
 * y si después cambia el link de Drive esa persona seguiría yendo al viejo.
 * Vive fuera de src/pages para poder probarla sin el runtime de Cloudflare.
 */
export function cartaRedirect(menuUrl: string | undefined): Response {
  if (!menuUrl || !menuUrl.startsWith("https://")) {
    return new Response("Todavía no cargamos la carta.", {
      status: 404,
      headers: {
        "cache-control": "no-store",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }
  return new Response(null, {
    status: 302,
    headers: { location: menuUrl, "cache-control": "no-store" },
  });
}
