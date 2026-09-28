import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  // Todo se sirve desde el servidor: cada pedido pasa por la validación de
  // Cloudflare Access (src/middleware.ts) y nada se prerenderiza.
  output: "server",
  // Sin sesiones de Astro ni Cloudflare Images: no se usan, y cada una
  // agregaba un recurso más (un KV y un binding de Images) para crear y
  // mantener en producción. Las fotos ya llegan achicadas desde el admin.
  session: false,
  adapter: cloudflare({
    imageService: "passthrough",
    // En desarrollo, la misma base local que el sitio: lo que se cambia acá
    // se ve en http://localhost:4321 sin copiar nada.
    persistState: { path: "../site/.wrangler/state" },
  }),
  server: { port: 4322 },
  site: "https://admin.falcocafe.com.ar",
});
