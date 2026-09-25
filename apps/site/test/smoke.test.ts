import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const PAGES = new URL("../src/pages/", import.meta.url);

// Astro declara el prerender POR PÁGINA, no en la configuración: hay que leer
// cada archivo de src/pages, si no el test pasa sin mirar nada.
function pageFiles(dir: URL): URL[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(entry.name + (entry.isDirectory() ? "/" : ""), dir);
    return entry.isDirectory() ? pageFiles(child) : [child];
  });
}

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

  it("ninguna página se prerenderiza", () => {
    const files = pageFiles(PAGES);
    // Sin esta línea el test pasaría aunque no hubiera leído un solo archivo.
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/export\s+const\s+prerender\s*=\s*true/);
    }
  });

  it("declara el binding DB apuntando a las migraciones del repo", () => {
    expect(wrangler).toContain('"binding": "DB"');
    expect(wrangler).toContain("packages/db/migrations");
  });
});
