import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";

export default defineConfig({
  // Todas las rutas se sirven desde el servidor: el import "cloudflare:workers"
  // rompe el build si alguna ruta se prerenderiza.
  output: "server",
  adapter: cloudflare(),
  integrations: [react()],
  site: "https://falco.cafe",
});
