import type { MiddlewareHandler } from "astro";

const NO_STORE = new Set(["/carta", "/404"]);

/**
 * max-age=0 para el navegador y s-maxage=60 para el borde: la persona siempre
 * revalida, pero una caché compartida puede responder sin pegarle a D1 durante
 * un minuto. La carta nunca se cachea (el link cambia cuando Falco sube otra)
 * y el 404 tampoco, para que una página nueva se vea enseguida.
 */
export function cacheHeaderFor(pathname: string, status = 200): string {
  if (status === 404 || NO_STORE.has(pathname)) return "no-store";
  return "public, max-age=0, s-maxage=60";
}

/**
 * www.falcocafe.com.ar lleva a falcocafe.com.ar, con la misma ruta: una sola
 * dirección para Google y para los links compartidos. 301 porque es para
 * siempre (a diferencia de /carta, que redirige con 302).
 */
export function apexRedirect(url: URL): string | null {
  if (!url.hostname.startsWith("www.")) return null;
  const apex = new URL(url);
  apex.hostname = url.hostname.slice("www.".length);
  return apex.toString();
}

export const onRequest: MiddlewareHandler = async (context, next) => {
  const apex = apexRedirect(context.url);
  if (apex) return Response.redirect(apex, 301);

  const response = await next();
  const type = response.headers.get("content-type") ?? "";
  if (type.includes("text/html")) {
    response.headers.set(
      "cache-control",
      cacheHeaderFor(context.url.pathname, response.status),
    );
  }
  return response;
};
