import { describe, expect, it } from "vitest";
import { toCoffee, toProduct } from "./rows";

describe("toCoffee", () => {
  it("pasa las columnas a camelCase y el pentágono a un objeto", () => {
    const coffee = toCoffee({
      id: 1,
      name: "Huila",
      farm: null,
      country: "Colombia",
      variety: null,
      process: null,
      altitude_masl: 1700,
      tasting_notes: "Durazno, panela",
      description: null,
      roaster: "Puerto Blest",
      acidity: 4,
      sweetness: 5,
      body: 2,
      aroma: 4,
      finish: 3,
    });
    expect(coffee.altitudeMasl).toBe(1700);
    expect(coffee.tastingNotes).toBe("Durazno, panela");
    expect(coffee.profile).toEqual({
      acidity: 4,
      sweetness: 5,
      body: 2,
      aroma: 4,
      finish: 3,
    });
  });

  it("las columnas vacías de la base llegan como undefined, nunca como null", () => {
    const coffee = toCoffee({
      id: 1,
      name: "Huila",
      farm: null,
      country: "Colombia",
      variety: null,
      process: null,
      altitude_masl: null,
      tasting_notes: null,
      description: null,
      roaster: "Puerto Blest",
      acidity: 1,
      sweetness: 1,
      body: 1,
      aroma: 1,
      finish: 1,
    });
    expect(coffee.farm).toBeUndefined();
    expect(coffee.altitudeMasl).toBeUndefined();
  });
});

describe("toProduct", () => {
  it("los enteros 0/1 de SQLite llegan como booleanos", () => {
    const product = toProduct({
      id: 3,
      slug: "remera-falco",
      kind: "apparel",
      shelf: "kits",
      coffee_id: null,
      name: "Remera Falco",
      detail: "Algodón",
      description: null,
      price_ars: 16000,
      image_key: null,
      is_new: 0,
      is_visible: 1,
      ask_stock: 1,
      sort_order: 2,
    });
    expect(product.isNew).toBe(false);
    expect(product.isVisible).toBe(true);
    expect(product.askStock).toBe(true);
    expect(product.coffeeId).toBeUndefined();
  });
});
