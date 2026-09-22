import type { Catalog, CatalogProduct } from "@falco/domain";

/**
 * El catálogo que la pantalla del pedido necesita para poder mostrarlo.
 *
 * El pedido vive en el navegador (localStorage) y guarda sólo ids y
 * cantidades: nunca nombres ni precios. Eso es a propósito -si el precio
 * cambiara, un pedido guardado hace dos días mostraría el viejo- pero
 * significa que para dibujar el pedido hace falta cruzar esos ids contra el
 * catálogo de verdad, que lo pone el servidor en la página.
 */

/** Una opción con su disponibilidad: el dominio no la necesita, la pantalla sí. */
export type PayloadOption = {
  id: number;
  label: string;
  isAvailable: boolean;
};

/** Lo que el servidor deja escrito en la página. */
export type PayloadProduct = Omit<CatalogProduct, "options"> & {
  options?: readonly PayloadOption[];
};

export type CatalogPayload = {
  products: PayloadProduct[];
  whatsapp?: string;
};

export const CATALOG_SCRIPT_ID = "falco-catalogo";

const vacio: CatalogPayload = { products: [] };

// `Document | HTMLElement` y no `ParentNode`: los tipos de Workers declaran su
// propio ParentNode (para HTMLRewriter) y pisa al del DOM.
export function readCatalogPayload(
  root: Document | HTMLElement = document,
): CatalogPayload {
  const tag = root.querySelector(`#${CATALOG_SCRIPT_ID}`);
  if (!tag?.textContent) return vacio;
  try {
    const parsed: unknown = JSON.parse(tag.textContent);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      Array.isArray((parsed as CatalogPayload).products)
    ) {
      return parsed as CatalogPayload;
    }
  } catch {
    // El JSON vino roto: mejor un pedido vacío que una pantalla que explota.
  }
  return vacio;
}

export const toCatalog = (payload: CatalogPayload): Catalog =>
  new Map(payload.products.map((product) => [product.id, product]));

/**
 * ¿Esta línea sigue siendo pedible?
 *
 * Un producto que se dejó de vender, o una molienda que se dio de baja,
 * desaparecen del catálogo. La línea tiene que irse del pedido antes de que
 * alguien la mande: el mensaje no puede pedir algo que ya no existe.
 */
export const lineIsAvailable =
  (payload: CatalogPayload) =>
  (line: { productId: number; optionId?: number }): boolean => {
    const product = payload.products.find((p) => p.id === line.productId);
    if (!product) return false;
    if (line.optionId === undefined) return true;
    const option = product.options?.find((o) => o.id === line.optionId);
    return Boolean(option?.isAvailable);
  };
