// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { seccionActual } from "./seccion-activa";

const seccion = (id: string, top: number): HTMLElement => {
  const el = document.createElement("section");
  el.id = id;
  el.getBoundingClientRect = () => ({ top }) as DOMRect;
  return el;
};

describe("la sección activa de la barra", () => {
  it("arriba de todo no hay ninguna", () => {
    expect(
      seccionActual([seccion("tienda", 900), seccion("donde-estamos", 1800)], 800),
    ).toBe("");
  });

  it("es la última que cruzó el 40% de la ventana", () => {
    expect(
      seccionActual([seccion("tienda", 100), seccion("donde-estamos", 700)], 800),
    ).toBe("tienda");
    expect(
      seccionActual([seccion("tienda", -900), seccion("donde-estamos", 300)], 800),
    ).toBe("donde-estamos");
  });
});
