import type { MiddlewareHandler } from "astro";
import { env } from "cloudflare:workers";
import { authenticate } from "./auth";

/**
 * Nadie pasa sin el login de Cloudflare Access, en ningún pedido. Y nada del
 * admin se guarda en ninguna caché: lo que se ve tiene que ser lo de ahora.
 */
export const onRequest: MiddlewareHandler = async (context, next) => {
  // ADMIN_DEV_EMAIL no está en wrangler.jsonc a propósito: sólo existe en el
  // .dev.vars de quien desarrolla, y auth.ts sólo lo acepta desde localhost.
  const vars = env as unknown as Record<string, string | undefined>;
  const auth = await authenticate(context.request, {
    team: vars.ACCESS_TEAM,
    aud: vars.ACCESS_AUD,
    devEmail: vars.ADMIN_DEV_EMAIL,
  });

  if (!auth.ok) {
    return new Response("No tenés acceso a este panel.", {
      status: 403,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  context.locals.email = auth.email;
  const response = await next();
  response.headers.set("cache-control", "no-store");
  return response;
};
