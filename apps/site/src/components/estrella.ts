/**
 * El polígono de una estrella, en porcentajes, listo para un `clip-path`.
 *
 * Los vértices alternan entre dos radios: los pares en el radio de afuera (las
 * puntas) y los impares en el de adentro (los valles). Arranca arriba, a las
 * doce, para que la estrella quede derecha antes de inclinarla.
 *
 * La lámina lo arma con JavaScript en el navegador; acá se calcula una vez, al
 * construir, y sale como un `clip-path` fijo.
 */
export function starPolygon(
  points: number,
  innerRadius: number,
  outerRadius: number,
): string {
  const vertices = points * 2;
  const coords: string[] = [];

  for (let index = 0; index < vertices; index++) {
    const angle = (Math.PI * 2 * index) / vertices - Math.PI / 2;
    const radius = index % 2 ? innerRadius : outerRadius;
    const x = (50 + radius * Math.cos(angle)).toFixed(1);
    const y = (50 + radius * Math.sin(angle)).toFixed(1);
    coords.push(`${x}% ${y}%`);
  }

  return coords.join(", ");
}

/** El sello de "Nuevo": 12 puntas entre el 36% y el 50%, medido en la lámina. */
export const NEW_BADGE_STAR = starPolygon(12, 36, 50);
