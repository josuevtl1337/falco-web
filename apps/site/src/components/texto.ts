/**
 * El formato de la descripción de un producto, tal como se escribe en el
 * admin: texto común, sin HTML.
 *
 * - Cada renglón es un párrafo.
 * - Un renglón que empieza con "-", "*" o "•" es un ítem de lista; los ítems
 *   seguidos forman una sola lista.
 * - **entre dos asteriscos** va en negrita.
 *
 * Se arma como datos (no como HTML) para que nada de lo que se escriba en el
 * admin llegue a la página como código.
 */

export type Parte = { texto: string; negrita: boolean };
export type Bloque =
  | { tipo: "parrafo"; partes: Parte[] }
  | { tipo: "lista"; items: Parte[][] };

const VINETA = /^\s*[-*•]\s+/;

/** "Control **total**: algo" → [Control ][total][: algo] */
export function partes(linea: string): Parte[] {
  const out: Parte[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let desde = 0;
  for (const m of linea.matchAll(re)) {
    if (m.index > desde) out.push({ texto: linea.slice(desde, m.index), negrita: false });
    out.push({ texto: m[1] ?? "", negrita: true });
    desde = m.index + m[0].length;
  }
  if (desde < linea.length) out.push({ texto: linea.slice(desde), negrita: false });
  return out;
}

export function bloques(texto: string): Bloque[] {
  const out: Bloque[] = [];
  for (const cruda of texto.replace(/\r\n?/g, "\n").split("\n")) {
    const linea = cruda.trim();
    if (!linea) continue;
    if (VINETA.test(linea)) {
      const item = partes(linea.replace(VINETA, ""));
      const ultimo = out.at(-1);
      if (ultimo?.tipo === "lista") ultimo.items.push(item);
      else out.push({ tipo: "lista", items: [item] });
    } else {
      out.push({ tipo: "parrafo", partes: partes(linea) });
    }
  }
  return out;
}

/** La misma descripción en una sola línea, sin marcas: para Google y al compartir. */
export function textoPlano(texto: string, maximo = 160): string {
  const plano = texto
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.trim().replace(VINETA, "").replace(/\*\*(.+?)\*\*/g, "$1"))
    .filter(Boolean)
    .join(" ");
  return plano.length <= maximo ? plano : `${plano.slice(0, maximo - 1).trimEnd()}…`;
}
