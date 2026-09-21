import { describe, expect, it } from "vitest";
import {
  addItem,
  createOrder,
  isExpired,
  markSent,
  ORDER_LIMITS,
  pruneUnavailable,
  removeItem,
  setCustomer,
  setQty,
  unitCount,
  unitsForProduct,
  type Order,
} from "./order";

const T0 = new Date("2026-09-19T15:00:00Z");
const later = (ms: number) => new Date(T0.getTime() + ms);
const HOUR = 60 * 60 * 1000;

describe("createOrder", () => {
  it("crea un pedido vacío con su código y fecha", () => {
    expect(createOrder("F-7K2Q", T0)).toEqual({
      code: "F-7K2Q",
      items: [],
      updatedAt: T0.toISOString(),
    });
  });
});

describe("addItem", () => {
  it("suma un producto nuevo con cantidad 1", () => {
    const { order, outcome } = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 1 },
      later(1000),
    );
    expect(outcome).toBe("added");
    expect(order.items).toEqual([{ productId: 1, qty: 1 }]);
    expect(order.updatedAt).toBe(later(1000).toISOString());
  });

  it("si el producto ya está, suma una unidad", () => {
    const first = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 1 },
      T0,
    ).order;
    const { order, outcome } = addItem(first, { productId: 1 }, T0);
    expect(outcome).toBe("increased");
    expect(order.items).toEqual([{ productId: 1, qty: 2 }]);
  });

  it(`no pasa de ${ORDER_LIMITS.maxUnitsPerProduct} unidades por producto`, () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 1 }, T0).order;
    const result = addItem(order, { productId: 1 }, T0);
    expect(result.outcome).toBe("unit_limit");
    expect(result.order).toBe(order);
  });

  it("el mismo producto con otra molienda es otra línea", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
    order = addItem(order, { productId: 3, optionId: 32 }, T0).order;
    expect(order.items).toEqual([
      { productId: 3, optionId: 31, qty: 1 },
      { productId: 3, optionId: 32, qty: 1 },
    ]);
  });

  it("dos moliendas del mismo producto ya son las 2 unidades permitidas", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
    order = addItem(order, { productId: 3, optionId: 32 }, T0).order;

    const again = addItem(order, { productId: 3, optionId: 31 }, T0);
    expect(again.outcome).toBe("unit_limit");
    expect(again.order).toBe(order);

    const otherSize = addItem(order, { productId: 3, optionId: 33 }, T0);
    expect(otherSize.outcome).toBe("unit_limit");
    expect(otherSize.order).toBe(order);
  });

  it(`no acepta más de ${ORDER_LIMITS.maxProducts} productos distintos`, () => {
    let order = createOrder("F-7K2Q", T0);
    for (let id = 1; id <= ORDER_LIMITS.maxProducts; id++)
      order = addItem(order, { productId: id }, T0).order;
    const result = addItem(order, { productId: 999 }, T0);
    expect(result.outcome).toBe("product_limit");
    expect(result.order.items).toHaveLength(ORDER_LIMITS.maxProducts);
  });

  it("otra molienda de un producto que ya está no cuenta como producto nuevo", () => {
    let order = createOrder("F-7K2Q", T0);
    for (let id = 1; id <= ORDER_LIMITS.maxProducts; id++)
      order = addItem(order, { productId: id }, T0).order;

    const sameProduct = addItem(order, { productId: 1, optionId: 31 }, T0);
    expect(sameProduct.outcome).toBe("added");
    expect(sameProduct.order.items).toHaveLength(ORDER_LIMITS.maxProducts + 1);

    expect(addItem(sameProduct.order, { productId: 999 }, T0).outcome).toBe(
      "product_limit",
    );
  });

  it("no modifica un pedido ya enviado", () => {
    const sent = markSent(
      addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order,
      T0,
    );
    const result = addItem(sent, { productId: 2 }, T0);
    expect(result.outcome).toBe("already_sent");
    expect(result.order).toBe(sent);
  });
});

describe("setQty y removeItem", () => {
  const base = addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order;

  it("cambia la cantidad sin pasar el máximo", () => {
    expect(setQty(base, { productId: 1 }, 5, T0).items).toEqual([
      { productId: 1, qty: 2 },
    ]);
  });

  it("con cantidad 0 quita la línea", () => {
    expect(setQty(base, { productId: 1 }, 0, T0).items).toEqual([]);
  });

  it("quitar una línea que no existe devuelve el mismo pedido", () => {
    expect(removeItem(base, { productId: 42 }, T0)).toBe(base);
  });

  it("con cantidad fraccionaria menor a 1 quita la línea", () => {
    expect(setQty(base, { productId: 1 }, 0.5, T0).items).toEqual([]);
  });

  it("con cantidad no finita (NaN) devuelve el mismo pedido", () => {
    expect(setQty(base, { productId: 1 }, NaN, T0)).toBe(base);
  });

  it("con cantidad infinita devuelve el mismo pedido", () => {
    expect(setQty(base, { productId: 1 }, Infinity, T0)).toBe(base);
  });

  it("si la cantidad no cambia, devuelve el mismo pedido", () => {
    expect(setQty(base, { productId: 1 }, 1, later(1000))).toBe(base);
  });

  it("una molienda se limita a lo que queda libre del producto", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
    order = addItem(order, { productId: 3, optionId: 32 }, T0).order;

    // La otra molienda ya ocupa una unidad: pedir 5 deja la línea en 1.
    expect(setQty(order, { productId: 3, optionId: 31 }, 5, later(1000))).toBe(
      order,
    );

    // Si la otra molienda se va, la que queda puede llegar a 2.
    const freed = removeItem(order, { productId: 3, optionId: 32 }, T0);
    expect(setQty(freed, { productId: 3, optionId: 31 }, 5, T0).items).toEqual([
      { productId: 3, optionId: 31, qty: 2 },
    ]);
  });
});

describe("unitsForProduct", () => {
  it("suma las unidades de todas las moliendas de un producto", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
    order = addItem(order, { productId: 3, optionId: 32 }, T0).order;
    order = addItem(order, { productId: 1 }, T0).order;
    expect(unitsForProduct(order, 3)).toBe(2);
    expect(unitsForProduct(order, 1)).toBe(1);
    expect(unitsForProduct(order, 999)).toBe(0);
  });
});

describe("setCustomer", () => {
  it("guarda nombre y comentario sin espacios de más, y borra los vacíos", () => {
    const order = setCustomer(
      createOrder("F-7K2Q", T0),
      { customerName: "  Sofía ", note: "   " },
      T0,
    );
    expect(order.customerName).toBe("Sofía");
    expect(order.note).toBeUndefined();
  });

  it("si el nombre y la nota no cambian (ignorando espacios), devuelve el mismo pedido", () => {
    const original = setCustomer(
      createOrder("F-7K2Q", T0),
      { customerName: "Sofía" },
      T0,
    );
    const result = setCustomer(
      original,
      { customerName: "  Sofía " },
      later(1000),
    );
    expect(result).toBe(original);
  });
});

describe("pruneUnavailable", () => {
  it("quita los productos que ya no están disponibles", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 2 }, T0).order;
    const pruned = pruneUnavailable(
      order,
      (line) => line.productId !== 2,
      later(HOUR),
    );
    expect(pruned.items).toEqual([{ productId: 1, qty: 1 }]);
    expect(pruned.updatedAt).toBe(later(HOUR).toISOString());
  });

  it("si no quita nada, devuelve el mismo pedido", () => {
    const order = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 1 },
      T0,
    ).order;
    expect(pruneUnavailable(order, () => true, later(HOUR))).toBe(order);
  });
});

describe("markSent", () => {
  const draft = addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order;

  it("marcar dos veces no renueva el plazo de 48 horas", () => {
    const sent = markSent(draft, T0);
    const again = markSent(sent, later(47 * HOUR));
    expect(again).toBe(sent);
    expect(again.sentAt).toBe(T0.toISOString());
    expect(isExpired(again, later(48 * HOUR))).toBe(true);
  });
});

describe("isExpired", () => {
  const draft: Order = addItem(
    createOrder("F-7K2Q", T0),
    { productId: 1 },
    T0,
  ).order;

  it("un pedido sin enviar vence a los 3 días del último cambio", () => {
    expect(isExpired(draft, later(72 * HOUR - 1))).toBe(false);
    expect(isExpired(draft, later(72 * HOUR))).toBe(true);
  });

  it("un pedido enviado vence a las 48 horas del envío", () => {
    const sent = markSent(draft, T0);
    expect(isExpired(sent, later(48 * HOUR - 1))).toBe(false);
    expect(isExpired(sent, later(48 * HOUR))).toBe(true);
  });
});

describe("unitCount", () => {
  it("suma las unidades de todas las líneas", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 2 }, T0).order;
    expect(unitCount(order)).toBe(3);
  });
});
