// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  CATALOG_SCRIPT_ID,
  lineIsAvailable,
  readCatalogPayload,
  toCatalog,
  type CatalogPayload,
} from "./catalogo";

const conJson = (texto: string) => {
  const root = document.createElement("div");
  const tag = document.createElement("script");
  tag.id = CATALOG_SCRIPT_ID;
  tag.textContent = texto;
  // appendChild y no append: los tipos de Workers pisan el append del DOM
  // (ver scripts/dom.ts).
  root.appendChild(tag);
  return root;
};

const payload: CatalogPayload = {
  products: [
    {
      id: 1,
      name: "Huila · Colombia",
      detail: "250 g",
      priceCashArs: 12000,
      priceCardArs: 13000,
      options: [
        { id: 1, label: "En grano", isAvailable: true },
        { id: 2, label: "Molido", isAvailable: false },
      ],
    },
    {
      id: 2,
      name: "Prensa",
      detail: "Cafetera de émbolo",
      priceCashArs: 33000,
      priceCardArs: 35000,
    },
  ],
};

describe("readCatalogPayload", () => {
  it("lee el catálogo que dejó el servidor", () => {
    const leido = readCatalogPayload(conJson(JSON.stringify(payload)));
    expect(leido.products).toHaveLength(2);
  });

  // Todo lo que sigue tiene la misma razón: la pantalla del pedido puede
  // quedarse sin catálogo, pero no puede romperse. Un pedido vacío se entiende;
  // una página en blanco, no.
  it("sin la etiqueta, devuelve un catálogo vacío", () => {
    expect(readCatalogPayload(document.createElement("div")).products).toEqual(
      [],
    );
  });

  it("con JSON roto, devuelve un catálogo vacío", () => {
    expect(readCatalogPayload(conJson("{esto no es json")).products).toEqual([]);
  });

  it("con un JSON que no tiene productos, devuelve vacío", () => {
    expect(readCatalogPayload(conJson('{"otra":"cosa"}')).products).toEqual([]);
  });
});

describe("toCatalog", () => {
  it("indexa los productos por id", () => {
    const catalog = toCatalog(payload);
    expect(catalog.get(1)?.name).toBe("Huila · Colombia");
    expect(catalog.get(99)).toBeUndefined();
  });
});

describe("lineIsAvailable", () => {
  const disponible = lineIsAvailable(payload);

  it("una línea con una molienda que hay, se queda", () => {
    expect(disponible({ productId: 1, optionId: 1 })).toBe(true);
  });

  // El caso que importa: alguien sumó "molido" y después se dio de baja. Esa
  // línea tiene que irse antes de que el mensaje pida algo que no existe.
  it("una línea con una molienda dada de baja, se va", () => {
    expect(disponible({ productId: 1, optionId: 2 })).toBe(false);
  });

  it("una línea con una molienda que ya ni figura, se va", () => {
    expect(disponible({ productId: 1, optionId: 99 })).toBe(false);
  });

  it("un producto que se dejó de vender, se va", () => {
    expect(disponible({ productId: 99 })).toBe(false);
  });

  it("un producto sin opciones se queda tal cual", () => {
    expect(disponible({ productId: 2 })).toBe(true);
  });
});
