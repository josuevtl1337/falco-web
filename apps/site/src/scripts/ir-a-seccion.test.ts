import { describe, expect, it } from "vitest";
import { seccionDelEnlace } from "./ir-a-seccion";

const HOME = "https://falcocafe.com.ar/";
const FICHA = "https://falcocafe.com.ar/tienda/prensa";

describe("seccionDelEnlace", () => {
  it("reconoce las secciones de la home, se esté donde se esté", () => {
    expect(seccionDelEnlace("/#tienda", HOME)).toBe("tienda");
    expect(seccionDelEnlace("#donde-estamos", HOME)).toBe("donde-estamos");
    expect(seccionDelEnlace("/#tienda", FICHA)).toBe("tienda");
  });

  it("el inicio es la sección vacía", () => {
    expect(seccionDelEnlace("/", FICHA)).toBe("");
  });

  it("un enlace relativo a otra página no es una sección de la home", () => {
    // Desde la ficha, "#tienda" es la ficha misma, no la home.
    expect(seccionDelEnlace("#tienda", FICHA)).toBeNull();
    expect(seccionDelEnlace("/tienda/prensa", HOME)).toBeNull();
    expect(seccionDelEnlace("/carta", HOME)).toBeNull();
    expect(seccionDelEnlace("/?x=1#tienda", HOME)).toBeNull();
  });

  it("otro sitio nunca", () => {
    expect(seccionDelEnlace("https://www.instagram.com/falco.cafe/", HOME)).toBeNull();
    expect(seccionDelEnlace("https://otro.com/#tienda", HOME)).toBeNull();
  });
});
