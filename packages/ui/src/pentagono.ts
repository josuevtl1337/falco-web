/**
 * El pentágono de cata: la misma geometría en el sitio y en el admin, que lo
 * dibuja en vivo mientras se cargan los cinco valores. Vive acá y no en el
 * sitio para que los dos lo usen sin copiarlo.
 */

/** Los cinco valores del perfil, del 1 al 5. Misma forma que en @falco/db. */
export type TastingProfile = {
  acidity: number;
  sweetness: number;
  body: number;
  aroma: number;
  finish: number;
};

export const PENTAGON_AXES = [
  "acidity",
  "sweetness",
  "body",
  "aroma",
  "finish",
] as const satisfies readonly (keyof TastingProfile)[];

export const PENTAGON_LABELS: Record<keyof TastingProfile, string> = {
  acidity: "Acidez",
  sweetness: "Dulzor",
  body: "Cuerpo",
  aroma: "Aroma",
  finish: "Final",
};

const CENTRE = 50;
const MAX_RADIUS = 40;
const MAX_VALUE = 5;

/**
 * Los cinco vértices del pentágono de cata, en un lienzo de 100 × 100.
 * El primer eje arranca arriba y los demás giran en sentido horario.
 */
export function pentagonPoints(
  profile: TastingProfile,
): { x: number; y: number }[] {
  return PENTAGON_AXES.map((axis, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / PENTAGON_AXES.length;
    const radius = (profile[axis] / MAX_VALUE) * MAX_RADIUS;
    return {
      x: CENTRE + radius * Math.cos(angle),
      y: CENTRE + radius * Math.sin(angle),
    };
  });
}

export function pentagonPolygon(profile: TastingProfile): string {
  return pentagonPoints(profile)
    .map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");
}
