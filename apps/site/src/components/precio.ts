import { formatArs } from "@falco/domain";

type Priced = {
  priceCashArs: number;
  priceCardArs: number;
  askStock: boolean;
};

/**
 * Cada precio como una pieza entera. En una ficha angosta el texto se parte
 * donde entra, y "$ 33.000" separado de "efectivo" deja de leerse como un
 * precio: quien lo mira no sabe cuál es cuál.
 */
export function priceParts(product: Priced): string[] {
  const parts = [
    `${formatArs(product.priceCashArs)} efectivo`,
    `${formatArs(product.priceCardArs)} tarjeta`,
  ];
  if (product.askStock) parts.push("Consultar stock");
  return parts;
}

export function priceLabel(product: Priced): string {
  // Falco cobra distinto según cómo se pague, y el sitio lo dice aunque no
  // cobre nada: el efectivo primero, que es el más barato.
  return priceParts(product).join(" · ");
}
