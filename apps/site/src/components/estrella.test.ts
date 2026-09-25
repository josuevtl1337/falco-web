import { describe, expect, it } from "vitest";
import { NEW_BADGE_STAR, starPolygon } from "./estrella";

const vertices = (polygon: string) =>
  polygon.split(", ").map((pair) => {
    const [x, y] = pair.split(" ").map((n) => Number.parseFloat(n));
    return { x: x!, y: y! };
  });

const distanceFromCentre = (point: { x: number; y: number }) =>
  Math.hypot(point.x - 50, point.y - 50);

describe("starPolygon", () => {
  it("tiene dos vértices por punta", () => {
    expect(vertices(starPolygon(12, 36, 50))).toHaveLength(24);
  });

  it("arranca con una punta arriba, a las doce", () => {
    const [first] = vertices(starPolygon(12, 36, 50));
    expect(first!.x).toBeCloseTo(50, 1);
    expect(first!.y).toBeCloseTo(0, 1);
  });

  // La estrella se dibuja alternando radios: si dos vecinos cayeran al mismo,
  // sería un polígono regular y no una estrella.
  //
  // La tolerancia es de medio punto y no más fina a propósito: las coordenadas
  // salen redondeadas a un decimal (es un clip-path, no un cálculo), y ese
  // redondeo corre el radio hasta 0,07. Con medio punto igual se distingue un
  // radio de otro, que están a 14 de distancia.
  it("alterna punta y valle, uno y uno", () => {
    const points = vertices(starPolygon(12, 36, 50));
    points.forEach((point, index) => {
      expect(distanceFromCentre(point)).toBeCloseTo(index % 2 ? 36 : 50, 0);
    });
  });

  it("ningún vértice se sale de la caja", () => {
    for (const point of vertices(starPolygon(12, 36, 50))) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(100);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(100);
    }
  });

  it("no hay dos vértices en el mismo lugar", () => {
    const points = vertices(starPolygon(12, 36, 50));
    expect(new Set(points.map((p) => `${p.x},${p.y}`)).size).toBe(24);
  });
});

describe("NEW_BADGE_STAR", () => {
  // Es lo que se mete dentro de polygon(...): si saliera con otra forma, el
  // clip-path se ignora en silencio y el sello vuelve a ser un cuadrado.
  it("sale como una lista de pares en porcentaje", () => {
    expect(NEW_BADGE_STAR).toMatch(
      /^(\d+\.\d% \d+\.\d%)(, \d+\.\d% \d+\.\d%){23}$/,
    );
  });
});
