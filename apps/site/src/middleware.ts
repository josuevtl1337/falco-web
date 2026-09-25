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

export const onRequest: MiddlewareHandler = async (context, next) => {
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
