import { describe, expect, it } from "vitest";
import { coincide, normalizar, seccionVisible } from "./carta-pagina";

describe("el buscador de la carta", () => {
  it("no distingue mayúsculas ni tildes", () => {
    expect(normalizar("  Café   CON leche ")).toBe("cafe con leche");
    expect(coincide("Café · Flat white", "cafe")).toBe(true);
    expect(coincide("Budín de limón", "BUDIN")).toBe(true);
  });

  it("cada palabra tiene que estar, en cualquier orden", () => {
    expect(coincide("Iced latte · Espresso, leche y hielo", "hielo latte")).toBe(true);
    expect(coincide("Iced latte · Espresso, leche y hielo", "latte chocolate")).toBe(false);
  });

  it("una búsqueda vacía muestra todo", () => {
    expect(coincide("Medialuna", "")).toBe(true);
    expect(coincide("Medialuna", "   ")).toBe(true);
  });
});

describe("la pestaña prendida", () => {
  it("es la última categoría cuyo título ya pasó la línea", () => {
    expect(seccionVisible([200, 900, 1600], 150)).toBe(0);
    expect(seccionVisible([-500, 100, 900], 150)).toBe(1);
    expect(seccionVisible([-1500, -900, -10], 150)).toBe(2);
  });
});
