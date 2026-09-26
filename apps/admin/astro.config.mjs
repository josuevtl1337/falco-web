import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  // Todo se sirve desde el servidor: cada pedido pasa por la validación de
  // Cloudflare Access (src/middleware.ts) y nada se prerenderiza.
  output: "server",
  adapter: cloudflare({
    // En desarrollo, la misma base local que el sitio: lo que se cambia acá
    // se ve en http://localhost:4321 sin copiar nada.
    persistState: { path: "../site/.wrangler/state" },
  }),
  server: { port: 4322 },
  site: "https://admin.falcocafe.com.ar",
});
