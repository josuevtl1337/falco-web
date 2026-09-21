import { describe, expect, it } from "vitest";
import { addItem, createOrder, markSent, ORDER_LIMITS } from "./order";
import {
  clearOrder,
  loadOrder,
  ORDER_STORAGE_KEY,
  saveOrder,
  type KeyValueStorage,
} from "./order-storage";

function memoryStorage(
  initial: Record<string, string> = {},
): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

const T0 = new Date("2026-09-19T15:00:00Z");
const HOUR = 60 * 60 * 1000;
const order = addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order;

describe("saveOrder y loadOrder", () => {
  it("guarda y vuelve a leer el mismo pedido", () => {
    const storage = memoryStorage();
    expect(saveOrder(storage, order)).toBe(true);
    expect(loadOrder(storage, T0)).toEqual(order);
  });

  it("devuelve null si no hay pedido guardado", () => {
    expect(loadOrder(memoryStorage(), T0)).toBeNull();
  });

  it("borra y descarta un pedido vencido", () => {
    const storage = memoryStorage();
    saveOrder(storage, markSent(order, T0));
    expect(loadOrder(storage, new Date(T0.getTime() + 48 * HOUR))).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un JSON roto", () => {
    const storage = memoryStorage({ [ORDER_STORAGE_KEY]: "{no es json" });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un objeto que no es un pedido", () => {
    const storage = memoryStorage({
      [ORDER_STORAGE_KEY]: JSON.stringify({
        code: "F-7K2Q",
        items: [{ productId: "1", qty: 9 }],
      }),
    });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un pedido con dos líneas iguales", () => {
    const storage = memoryStorage({
      [ORDER_STORAGE_KEY]: JSON.stringify({
        code: "F-7K2Q",
        items: [
          { productId: 1, qty: 2 },
          { productId: 1, qty: 2 },
        ],
        updatedAt: T0.toISOString(),
      }),
    });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un producto con más unidades que el tope, repartidas en moliendas", () => {
    const storage = memoryStorage({
      [ORDER_STORAGE_KEY]: JSON.stringify({
        code: "F-7K2Q",
        items: [
          { productId: 3, optionId: 31, qty: 2 },
          { productId: 3, optionId: 32, qty: 1 },
        ],
        updatedAt: T0.toISOString(),
      }),
    });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("acepta las moliendas de un mismo producto mientras no pasen el tope", () => {
    const valid = {
      code: "F-7K2Q",
      items: [
        { productId: 3, optionId: 31, qty: 1 },
        { productId: 3, optionId: 32, qty: 1 },
      ],
      updatedAt: T0.toISOString(),
    };
    const storage = memoryStorage({
      [ORDER_STORAGE_KEY]: JSON.stringify(valid),
    });
    expect(loadOrder(storage, T0)).toEqual(valid);
  });

  it("borra y descarta un pedido con más productos distintos que el tope", () => {
    const items = Array.from(
      { length: ORDER_LIMITS.maxProducts + 1 },
      (_unused, index) => ({ productId: index + 1, qty: 1 }),
    );
    const storage = memoryStorage({
      [ORDER_STORAGE_KEY]: JSON.stringify({
        code: "F-7K2Q",
        items,
        updatedAt: T0.toISOString(),
      }),
    });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un código que no es un código de pedido", () => {
    for (const code of ["", "hola mundo", "F-0000", "f-7k2q"]) {
      const storage = memoryStorage({
        [ORDER_STORAGE_KEY]: JSON.stringify({
          code,
          items: [{ productId: 1, qty: 1 }],
          updatedAt: T0.toISOString(),
        }),
      });
      expect(loadOrder(storage, T0)).toBeNull();
      expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
    }
  });

  it("borra y descarta fechas que no son un instante ISO", () => {
    for (const dates of [
      { updatedAt: "Sep 19 2026" },
      { updatedAt: "2026-09-19" },
      { updatedAt: T0.toISOString(), sentAt: "Sep 19 2026" },
    ]) {
      const storage = memoryStorage({
        [ORDER_STORAGE_KEY]: JSON.stringify({
          code: "F-7K2Q",
          items: [{ productId: 1, qty: 1 }],
          ...dates,
        }),
      });
      expect(loadOrder(storage, T0)).toBeNull();
      expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
    }
  });

  it("no tira errores si el navegador bloquea el almacenamiento", () => {
    expect(saveOrder(brokenStorage, order)).toBe(false);
    expect(loadOrder(brokenStorage, T0)).toBeNull();
    expect(() => clearOrder(brokenStorage)).not.toThrow();
  });

  it("funciona sin almacenamiento disponible", () => {
    expect(saveOrder(null, order)).toBe(false);
    expect(loadOrder(null, T0)).toBeNull();
  });
});

describe("clearOrder", () => {
  it("borra el pedido guardado", () => {
    const storage = memoryStorage();
    saveOrder(storage, order);
    clearOrder(storage);
    expect(loadOrder(storage, T0)).toBeNull();
  });
});
