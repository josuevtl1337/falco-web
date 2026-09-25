import { describe, expect, it } from "vitest";
import { addItem, createOrder, setCustomer, type Order } from "./order";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  formatArs,
  orderTotal,
  type Catalog,
} from "./message";

const T0 = new Date("2026-09-19T15:00:00Z");

const CATALOG: Catalog = new Map([
  [
    1,
    {
      id: 1,
      name: "Huila · Colombia",
      detail: "250 g",
      priceCardArs: 13000,
      priceCashArs: 12000,
      options: [
        { id: 11, label: "En grano" },
        { id: 12, label: "Molido" },
      ],
    },
  ],
  [
    2,
    {
      id: 2,
      name: "Filtros V60 · 2",
      detail: "Caja de 100",
      priceCardArs: 28000,
      priceCashArs: 26000,
    },
  ],
]);

function sampleOrder(): Order {
  let order = createOrder("F-7K2Q", T0);
  order = addItem(order, { productId: 1, optionId: 12 }, T0).order;
  order = addItem(order, { productId: 2 }, T0).order;
  order = addItem(order, { productId: 2 }, T0).order;
  return order;
}

describe("formatArs", () => {
  it("usa punto como separador de miles", () => {
    expect(formatArs(500)).toBe("$ 500");
    expect(formatArs(41000)).toBe("$ 41.000");
    expect(formatArs(1234567)).toBe("$ 1.234.567");
  });

  it("nunca muestra un precio negativo ni roto", () => {
    expect(formatArs(-5000)).toBe("$ 0");
    expect(formatArs(NaN)).toBe("$ 0");
    expect(formatArs(Infinity)).toBe("$ 0");
    expect(formatArs(-Infinity)).toBe("$ 0");
  });
});

describe("orderTotal", () => {
  it("suma el efectivo y la tarjeta por separado, con cantidades mayores a 1", () => {
    expect(orderTotal(sampleOrder(), CATALOG)).toEqual({
      cash: 64000,
      card: 69000,
    });
  });
});

describe("buildOrderMessage", () => {
  it("arma el mensaje completo con nombre y comentario", () => {
    const order = setCustomer(
      sampleOrder(),
      { customerName: "Sofía", note: "Paso a la tarde" },
      T0,
    );
    expect(buildOrderMessage(order, CATALOG)).toBe(
      [
        "¡Buenas! Soy Sofía y quiero hacer este pedido (F-7K2Q):",
        "",
        "• 1 × Huila · Colombia · 250 g · Molido",
        "• 2 × Filtros V60 · 2 · Caja de 100",
        "",
        "Total estimado: $ 64.000 en efectivo o transferencia · $ 69.000 con tarjeta",
        "Lo retiraría en el local cuando me confirmen.",
        "Comentario: Paso a la tarde.",
        "",
        "¿Me confirman si hay stock y desde qué hora lo puedo retirar?",
      ].join("\n"),
    );
  });

  it("sin nombre ni comentario, usa el saludo corto y no agrega la línea del comentario", () => {
    const message = buildOrderMessage(sampleOrder(), CATALOG);
    expect(
      message?.startsWith("¡Buenas! Quiero hacer este pedido (F-7K2Q):\n"),
    ).toBe(true);
    expect(message).not.toContain("Comentario");
  });

  it("no duplica el punto si el comentario ya termina con signo", () => {
    const order = setCustomer(sampleOrder(), { note: "¿Tienen bolsas?" }, T0);
    expect(buildOrderMessage(order, CATALOG)).toContain(
      "Comentario: ¿Tienen bolsas?\n",
    );
  });

  it("nunca usa palabras que den el pedido por hecho", () => {
    const message = buildOrderMessage(sampleOrder(), CATALOG)?.toLowerCase();
    for (const word of ["comprado", "listo", "pedido hecho"])
      expect(message).not.toContain(word);
  });

  it("si la opción elegida ya no está, saca la línea entera", () => {
    // Dos líneas del mismo café: una con una molienda válida, otra con una
    // molienda que ya no existe en el catálogo. Solo la primera se cobra.
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1, optionId: 11 }, T0).order;
    order = addItem(order, { productId: 1, optionId: 99 }, T0).order;
    const message = buildOrderMessage(order, CATALOG);
    expect(message?.match(/^•/gm)).toHaveLength(1);
    expect(message).toContain("• 1 × Huila · Colombia · 250 g · En grano");
    expect(message).toContain(
      "Total estimado: $ 12.000 en efectivo o transferencia · $ 13.000 con tarjeta",
    );
  });

  it("un pedido sin líneas no arma mensaje", () => {
    expect(
      buildOrderMessage(createOrder("F-7K2Q", T0), CATALOG),
    ).toBeUndefined();
  });

  it("un pedido cuyas líneas ya no existen tampoco arma mensaje", () => {
    const order = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 777 },
      T0,
    ).order;
    expect(buildOrderMessage(order, CATALOG)).toBeUndefined();
  });
});

describe("buildWhatsAppUrl", () => {
  it("deja solo los dígitos del número y codifica el mensaje", () => {
    expect(buildWhatsAppUrl("+54 9 342 555-1234", "¡Hola!\nSí")).toBe(
      "https://wa.me/5493425551234?text=%C2%A1Hola!%0AS%C3%AD",
    );
  });

  it("rechaza un número demasiado corto", () => {
    expect(() => buildWhatsAppUrl("342 555", "Hola")).toThrow();
  });

  it("sin mensaje abre el chat igual, sin tirar error", () => {
    expect(buildWhatsAppUrl("+54 9 342 555-1234")).toBe(
      "https://wa.me/5493425551234",
    );
    expect(
      buildWhatsAppUrl(
        "+54 9 342 555-1234",
        buildOrderMessage(createOrder("F-7K2Q", T0), CATALOG),
      ),
    ).toBe("https://wa.me/5493425551234");
  });
});
