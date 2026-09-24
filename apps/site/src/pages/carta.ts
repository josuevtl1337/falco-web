import type { APIRoute } from "astro";
import { env } from "cloudflare:workers";
import { getSettings } from "@falco/db";
import { cartaRedirect } from "../scripts/carta";

export const GET: APIRoute = async () => {
  const settings = await getSettings(env.DB);
  return cartaRedirect(settings.menu_url);
};
