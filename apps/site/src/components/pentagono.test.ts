import { describe, expect, it } from "vitest";
import { pentagonPoints } from "./pentagono";

const distanceFromCentre = (point: { x: number; y: number }) =>
  Math.hypot(point.x - 50, point.y - 50);

describe("pentagonPoints", () => {
  it("devuelve cinco puntos", () => {
    const points = pentagonPoints({
      acidity: 3,
      sweetness: 3,
      body: 3,
      aroma: 3,
      finish: 3,
    });
    expect(points).toHaveLength(5);
  });

  it("el primer eje apunta hacia arriba", () => {
    const [first] = pentagonPoints({
      acidity: 5,
      sweetness: 1,
      body: 1,
      aroma: 1,
      finish: 1,
    });
    expect(first?.x).toBeCloseTo(50, 1);
    expect(first?.y).toBeLessThan(50);
  });

  it("un valor más alto queda más lejos del centro", () => {
    const low = pentagonPoints({
      acidity: 1,
      sweetness: 1,
      body: 1,
      aroma: 1,
      finish: 1,
    });
    const high = pentagonPoints({
      acidity: 5,
      sweetness: 1,
      body: 1,
      aroma: 1,
      finish: 1,
    });
    expect(distanceFromCentre(high[0]!)).toBeGreaterThan(
      distanceFromCentre(low[0]!),
    );
  });

  it("todos los puntos caen dentro del lienzo de 100 × 100", () => {
    const points = pentagonPoints({
      acidity: 5,
      sweetness: 5,
      body: 5,
      aroma: 5,
      finish: 5,
    });
    for (const point of points) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(100);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(100);
    }
  });

  it("los cinco ejes quedan repartidos, sin dos puntos superpuestos", () => {
    // Con el mismo valor en todos los ejes, los cinco vértices tienen que caer
    // en posiciones distintas: si dos coinciden, el gráfico deja de ser un
    // pentágono y miente sobre el café.
    const points = pentagonPoints({
      acidity: 4,
      sweetness: 4,
      body: 4,
      aroma: 4,
      finish: 4,
    });
    const keys = new Set(
      points.map((p) => `${p.x.toFixed(3)},${p.y.toFixed(3)}`),
    );
    expect(keys.size).toBe(5);
    for (const point of points)
      expect(distanceFromCentre(point)).toBeCloseTo(32, 1);
  });
});
