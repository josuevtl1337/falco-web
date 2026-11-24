/**
 * Lo que la ficha de un café arma con los datos del admin: la línea de
 * origen, el nombre sin el país, las notas como etiquetas y el puntaje.
 */

const sinTildes = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/**
 * "Colombia · Huila": el país y la región (el campo "Región" del café). Si
 * la región ya está en el nombre del producto, no se repite.
 */
export function origenDe(
  coffee: { country: string; name: string },
  productName: string,
): string {
  const region = coffee.name.trim();
  const repetida =
    !region ||
    sinTildes(region) === sinTildes(coffee.country) ||
    sinTildes(productName).includes(sinTildes(region));
  return repetida ? coffee.country : `${coffee.country} · ${region}`;
}

/**
 * El nombre del producto sin el país, que ya va en la línea de origen:
 * "Colombia Pink Bourbon" → "Pink Bourbon", "Pacamara Honey - Nicaragua" →
 * "Pacamara Honey". Si sacarlo deja el nombre vacío, queda como estaba.
 */
export function nombreSinPais(productName: string, country: string): string {
  const pais = sinTildes(country.trim());
  if (!pais) return productName;
  const palabras = productName.trim();
  const plano = sinTildes(palabras);
  let resto = palabras;
  if (plano.startsWith(`${pais} `)) resto = palabras.slice(pais.length);
  else if (plano.endsWith(` ${pais}`)) resto = palabras.slice(0, -pais.length);
  resto = resto.replace(/^[\s\-–·,]+|[\s\-–·,]+$/g, "");
  return resto || productName;
}

/** "Cítricos, flores y uva verde" → ["Cítricos", "Flores", "Uva verde"]. */
export function notasDe(tastingNotes: string | undefined, maximo = 3): string[] {
  if (!tastingNotes) return [];
  return tastingNotes
    .split(/\s*(?:,|·|;|\n|\sy\s)\s*/i)
    .map((nota) => nota.trim().replace(/\.$/, ""))
    .filter(Boolean)
    .map((nota) => nota.charAt(0).toLocaleUpperCase("es") + nota.slice(1))
    .slice(0, maximo);
}

/** 86.5 → "86,5"; 87 → "87". */
export const puntajeSca = (score: number): string =>
  score.toLocaleString("es-AR", { maximumFractionDigits: 2 });
