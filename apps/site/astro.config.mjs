import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  // Todas las rutas se sirven desde el servidor: el import "cloudflare:workers"
  // rompe el build si alguna ruta se prerenderiza.
  output: "server",
  // Sin sesiones de Astro ni Cloudflare Images: no se usan, y cada una
  // agregaba un recurso más (un KV y un binding de Images) para crear y
  // mantener en producción. Las fotos ya llegan achicadas desde el admin.
  session: false,
  adapter: cloudflare({ imageService: "passthrough" }),
  integrations: [react()],
  site: "https://falcocafe.com.ar",
});
