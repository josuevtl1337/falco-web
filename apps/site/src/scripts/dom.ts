/**
 * Poner hijos dentro de un elemento.
 *
 * Existe por una colisión de tipos, no por gusto: los tipos de Cloudflare
 * Workers (`worker-configuration.d.ts`, que genera `wrangler types`) declaran
 * su propio `Element.append(content: string | ReadableStream | Response)` para
 * HTMLRewriter, y ese pisa al `append()` del DOM. Cualquier
 * `elemento.append(otroElemento)` no compila aunque en el navegador funcione
 * perfecto.
 *
 * `appendChild` no está declarado por Workers, así que pasa limpio. Esto
 * envuelve esa llamada y además acepta texto suelto, que es lo único que
 * `append` daba de más.
 */
export const poner = (
  padre: Node,
  ...hijos: readonly (Node | string)[]
): void => {
  for (const hijo of hijos) {
    padre.appendChild(
      typeof hijo === "string" ? document.createTextNode(hijo) : hijo,
    );
  }
};

/** Un elemento con su clase y su texto, que es el 90% de lo que se arma acá. */
export const elemento = (
  tag: string,
  clase: string,
  contenido?: string,
): HTMLElement => {
  const el = document.createElement(tag);
  if (clase) el.className = clase;
  if (contenido !== undefined) el.textContent = contenido;
  return el;
};
