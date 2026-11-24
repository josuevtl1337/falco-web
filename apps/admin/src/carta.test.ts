import { describe, expect, it } from "vitest";
import { itemAForm, leerCategoria, leerItem } from "./carta";

const form = (campos: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(campos)) f.set(k, v);
  return f;
};

describe("el formulario de un ítem de la carta", () => {
  it("lee el precio con punto de miles y el interruptor", () => {
    const { borrador } = leerItem(
      form({ categoryId: "2", name: "Latte", description: "", priceArs: "$ 5.400", isVisible: "on" }),
    );
    expect(borrador).toEqual({ categoryId: 2, name: "Latte", description: "", priceArs: 5400, isVisible: true });
  });

  it("sin categoría ni precio, deja que la validación avise", () => {
    const { borrador } = leerItem(form({ name: "Latte" }));
    expect(borrador.categoryId).toBe(0);
    expect(borrador.priceArs).toBeNaN();
    expect(borrador.isVisible).toBe(false);
  });

  it("muestra el precio guardado con punto de miles", () => {
    expect(
      itemAForm({ id: 1, categoryId: 1, name: "Latte", priceArs: 5400, isVisible: true, sortOrder: 1 }).priceArs,
    ).toBe("5.400");
  });
});

describe("el formulario de una categoría", () => {
  it("lee el nombre, la nota y si se ve", () => {
    expect(leerCategoria(form({ name: "Café", note: "Leche vegetal +$800" })).borrador).toEqual({
      name: "Café",
      note: "Leche vegetal +$800",
      isVisible: false,
    });
  });
});
