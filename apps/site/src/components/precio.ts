import { formatArs } from "@falco/domain";

export function priceLabel(product: {
  priceCashArs: number;
  priceCardArs: number;
  askStock: boolean;
}): string {
  // Falco cobra distinto según cómo se pague, y el sitio lo dice aunque no
  // cobre nada: el efectivo primero, que es el más barato.
  const prices = `${formatArs(product.priceCashArs)} efectivo · ${formatArs(product.priceCardArs)} tarjeta`;
  return product.askStock ? `${prices} · Consultar stock` : prices;
}
