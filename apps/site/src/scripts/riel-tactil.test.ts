import { describe, expect, it } from "vitest";
import { envolver } from "./riel-tactil";

describe("el bucle del riel en el celular", () => {
  it("en el medio la posición queda como está", () => {
    expect(envolver(500, 1200, 2000)).toBe(500);
  });

  it("al llegar al final salta una tanda para atrás", () => {
    expect(envolver(2000.5, 1200, 2000)).toBe(800.5);
  });

  it("al llegar al principio salta una tanda para adelante", () => {
    expect(envolver(-0.4, 1200, 2000)).toBeCloseTo(1199.6);
  });
});
