import { describe, expect, it } from "vitest";
import { priceLabel } from "./precio";

const base = { priceCashArs: 33000, priceCardArs: 35000, askStock: false };

describe("priceLabel", () => {
  it("muestra los dos precios, el de efectivo primero", () => {
    expect(priceLabel(base)).toBe("$ 33.000 efectivo · $ 35.000 tarjeta");
  });

  it("si hay que consultar stock, lo dice además de los precios", () => {
    expect(priceLabel({ ...base, askStock: true })).toBe(
      "$ 33.000 efectivo · $ 35.000 tarjeta · Consultar stock",
    );
  });

  it("nunca dice comprar ni comprado", () => {
    const label = priceLabel({ ...base, askStock: true }).toLowerCase();
    expect(label).not.toContain("comprar");
    expect(label).not.toContain("comprado");
  });

  it("nunca esconde que la tarjeta sale más", () => {
    // Mostrar un solo precio deja dos salidas malas: parecer más caro de lo
    // que sos, o sorprender a alguien en la caja.
    expect(priceLabel(base)).toContain("tarjeta");
    expect(priceLabel(base)).toContain("efectivo");
  });
});
