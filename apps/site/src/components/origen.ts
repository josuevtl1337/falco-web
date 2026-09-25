import type { Coffee } from "@falco/db";

/**
 * Cómo se nombra el café en la lámina: la región y el país, juntos. Es el dato
 * que la tarjeta chica del celular muestra sola, sin la finca, porque ahí no
 * entra la línea completa.
 */
export const placeLabel = (coffee: Coffee): string =>
  [coffee.name, coffee.country].filter(Boolean).join(", ");

/** La línea principal del origen: "Finca La Esperanza · Huila, Colombia". */
export const originLabel = (coffee: Coffee): string =>
  [coffee.farm, placeLabel(coffee)].filter(Boolean).join(" · ");

/** La línea secundaria: "Caturra · Lavado · 1750 msnm". */
export const originDetail = (coffee: Coffee): string =>
  [
    coffee.variety,
    coffee.process,
    coffee.altitudeMasl ? `${coffee.altitudeMasl} msnm` : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
