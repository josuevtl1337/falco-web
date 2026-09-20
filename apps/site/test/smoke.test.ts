import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const config = readFileSync(
  new URL("../astro.config.mjs", import.meta.url),
  "utf8",
);
const wrangler = readFileSync(
  new URL("../wrangler.jsonc", import.meta.url),
  "utf8",
);

describe("configuración del sitio", () => {
  it("sirve todas las rutas desde el servidor", () => {
    // Con una sola ruta prerenderizada, el import "cloudflare:workers" rompe el build.
    expect(config).toContain('output: "server"');
  });

  it("no prerenderiza ninguna ruta", () => {
    expect(config).not.toContain("prerender: true");
  });

  it("declara el binding DB apuntando a las migraciones del repo", () => {
    expect(wrangler).toContain('"binding": "DB"');
    expect(wrangler).toContain("packages/db/migrations");
  });
});
