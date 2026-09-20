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
      priceArs: 12000,
      options: [
        { id: 11, label: "En grano" },
        { id: 12, label: "Molido" },
      ],
    },
  ],
  [
    2,
    { id: 2, name: "Filtros V60 · 02", detail: "Caja de 100", priceArs: 6500 },
  ],
  [
    3,
    {
      id: 3,
      name: "Remera Falco",
      detail: "Algodón",
      priceArs: 16000,
      options: [{ id: 31, label: "Talle M" }],
    },
  ],
]);

function sampleOrder(): Order {
  let order = createOrder("F-7K2Q", T0);
  order = addItem(order, { productId: 1, optionId: 12 }, T0).order;
  order = addItem(order, { productId: 2 }, T0).order;
  order = addItem(order, { productId: 2 }, T0).order;
  order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
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
  it("suma precio por cantidad", () => {
    expect(orderTotal(sampleOrder(), CATALOG)).toBe(41000);
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
        "• 2 × Filtros V60 · 02 · Caja de 100",
        "• 1 × Remera Falco · Algodón · Talle M",
        "",
        "Total estimado: $ 41.000",
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
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1, optionId: 11 }, T0).order;
    order = addItem(order, { productId: 3, optionId: 99 }, T0).order;
    const message = buildOrderMessage(order, CATALOG);
    expect(message).not.toContain("Remera");
    expect(message).toContain("• 1 × Huila · Colombia · 250 g · En grano");
    expect(message).toContain("Total estimado: $ 12.000");
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
