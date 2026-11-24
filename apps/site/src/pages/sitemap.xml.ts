import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { listMenu, listShelf } from "@falco/db";
import { sitemapXml } from "../seo";

/**
 * La home, la carta (si ya está cargada) y cada producto visible. Los ocultos no: su página da 404. Se arma
 * en cada pedido, así un producto nuevo del admin entra solo.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const [coffee, kits, menu] = await Promise.all([
    listShelf(env.DB, "coffee"),
    listShelf(env.DB, "kits"),
    listMenu(env.DB),
  ]);
  const paths = [
    "/",
    ...(menu.length > 0 ? ["/carta"] : []),
    ...[...coffee, ...kits].map((product) => `/tienda/${product.slug}`),
  ];
  return new Response(sitemapXml(site ?? url, paths), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600",
    },
  });
};
