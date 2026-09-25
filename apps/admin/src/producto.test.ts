import { describe, expect, it } from "vitest";
import { leerPrecio, leerProducto } from "./producto";

describe("los precios", () => {
  it("entiende los pesos con punto de miles y con el signo", () => {
    expect(leerPrecio("12.000")).toBe(12000);
    expect(leerPrecio("$ 64.500")).toBe(64500);
    expect(leerPrecio("900")).toBe(900);
  });

  it("deja pasar los centavos para que la validación los rechace", () => {
    expect(leerPrecio("12,50")).toBe(12.5);
  });

  it("vacío no es cero", () => {
    expect(Number.isNaN(leerPrecio(""))).toBe(true);
  });
});

describe("el formulario de producto", () => {
  const form = (pares: [string, string][]) => {
    const f = new FormData();
    for (const [k, v] of pares) f.append(k, v);
    return f;
  };

  it("lee las moliendas conservando sus ids e ignora la fila vacía", () => {
    const { borrador } = leerProducto(
      form([
        ["kind", "coffee"], ["name", "Huila"], ["detail", "250 g"],
        ["priceCashArs", "12.000"], ["priceCardArs", "13.000"], ["isVisible", "on"],
        ["opcion-id", "4"], ["opcion-label", "En grano"], ["opcion-stock", "1"],
        ["opcion-id", "5"], ["opcion-label", "Molido"], ["opcion-stock", "0"],
        ["opcion-id", ""], ["opcion-label", ""], ["opcion-stock", "1"],
      ]),
    );
    expect(borrador.options).toEqual([
      { id: 4, label: "En grano", isAvailable: true },
      { id: 5, label: "Molido", isAvailable: false },
    ]);
    expect(borrador.product.isVisible).toBe(true);
    expect(borrador.product.isNew).toBe(false);
    expect(borrador.coffee).toBeDefined();
  });

  it("un accesorio no manda origen aunque el formulario lo traiga", () => {
    const { borrador } = leerProducto(form([["kind", "gear"], ["coffee-name", "X"]]));
    expect(borrador.coffee).toBeUndefined();
  });
});
