import { describe, expect, it } from "vitest";
import { claveDeFoto, FOTO_MAXIMA, validarFoto } from "./fotos";

describe("las fotos", () => {
  it("acepta WebP y JPEG livianos", () => {
    expect(validarFoto("image/webp", 150_000)).toBeNull();
    expect(validarFoto("image/jpeg", 150_000)).toBeNull();
  });

  it("rechaza otros formatos, vacías y pesadas, diciendo qué pasa", () => {
    expect(validarFoto("image/png", 1000)).toMatch(/WebP o JPEG/);
    expect(validarFoto("image/webp", 0)).toMatch(/vacía/);
    expect(validarFoto("image/webp", FOTO_MAXIMA + 1)).toMatch(/pesa/);
  });

  it("la clave depende del contenido: otra foto, otra dirección", async () => {
    const a = await claveDeFoto(3, new TextEncoder().encode("una").buffer, "image/webp");
    const b = await claveDeFoto(3, new TextEncoder().encode("otra").buffer, "image/webp");
    expect(a).toMatch(/^productos\/3-[0-9a-f]{16}\.webp$/);
    expect(a).not.toBe(b);
  });
});
