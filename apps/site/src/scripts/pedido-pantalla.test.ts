// @vitest-environment jsdom
import { ORDER_STORAGE_KEY, type Order } from "@falco/domain";
import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG_SCRIPT_ID } from "./catalogo";
import { conectarPantallaDePedido } from "./pedido-pantalla";

const CATALOGO = {
  products: [
    {
      id: 1,
      name: "Huila · Colombia",
      detail: "250 g",
      priceCashArs: 12000,
      priceCardArs: 13000,
      options: [{ id: 1, label: "En grano", isAvailable: true }],
    },
    {
      id: 3,
      name: "Filtro Aeropress",
      detail: "Filtro para Aeropress",
      priceCashArs: 26000,
      priceCardArs: 28000,
      options: [],
    },
  ],
  whatsapp: "543424667646",
};

const pedido = (extra: Partial<Order> = {}): Order => ({
  code: "F-TEST",
  items: [{ productId: 1, optionId: 1, qty: 1 }],
  updatedAt: new Date().toISOString(),
  ...extra,
});

const montar = (order: Order | null) => {
  localStorage.clear();
  if (order) localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));

  document.body.innerHTML = `
    <script id="${CATALOG_SCRIPT_ID}" type="application/json">${JSON.stringify(CATALOGO)}</script>
    <div data-pedido-pantalla>
      <p data-pedido-resumen></p>
      <ol data-pedido-pasos hidden>
        <li data-paso="1"></li><li data-paso="2"></li><li data-paso="3"></li>
      </ol>
      <div data-pedido-cuerpo></div>
      <div data-pedido-envio hidden></div>
    </div>`;

  conectarPantallaDePedido();
};

const guardado = (): Order | null => {
  const raw = localStorage.getItem(ORDER_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Order) : null;
};

const escribir = (id: string, valor: string) => {
  const campo = document.querySelector<HTMLInputElement>(`#${id}`)!;
  campo.value = valor;
  campo.dispatchEvent(new Event("change", { bubbles: true }));
};

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
});

describe("la pantalla del pedido", () => {
  it("sin pedido, invita a ir a la tienda y no ofrece enviar", () => {
    montar(null);
    expect(document.querySelector(".pedido__vacio")).not.toBeNull();
    expect(
      document.querySelector<HTMLElement>("[data-pedido-envio]")!.hidden,
    ).toBe(true);
  });

  it("dibuja un renglón por línea, con su cantidad", () => {
    montar(pedido({ items: [{ productId: 1, optionId: 1, qty: 2 }] }));
    const renglones = document.querySelectorAll(".renglon");
    expect(renglones).toHaveLength(1);
    expect(renglones[0]!.textContent).toContain("Huila · Colombia");
    expect(renglones[0]!.textContent).toContain("En grano");
  });

  it("suma los dos precios de todas las líneas", () => {
    montar(
      pedido({
        items: [
          { productId: 1, optionId: 1, qty: 1 },
          { productId: 3, qty: 2 },
        ],
      }),
    );
    const total = document.querySelector(".pedido__numeros")!.textContent;
    // 12.000 + 2 × 26.000 en efectivo; 13.000 + 2 × 28.000 con tarjeta.
    expect(total).toContain("$ 64.000");
    expect(total).toContain("$ 69.000");
  });

  /*
   * El bug que hubo: los dos campos se dibujan juntos y cada uno se quedaba
   * con el pedido de ESE momento. Como setCustomer escribe los dos valores, el
   * segundo campo en cambiar guardaba el nombre viejo -vacío- encima del que
   * la persona acababa de escribir, y el mensaje salía sin nombre.
   */
  it("guardar el comentario no borra el nombre escrito antes", () => {
    montar(pedido());

    escribir("pedido-nombre", "Sofía");
    expect(guardado()?.customerName).toBe("Sofía");

    escribir("pedido-nota", "Paso a la tarde");
    expect(guardado()?.note).toBe("Paso a la tarde");
    expect(guardado()?.customerName).toBe("Sofía");
  });

  it("y al revés: guardar el nombre no borra el comentario", () => {
    montar(pedido());

    escribir("pedido-nota", "Paso a la tarde");
    escribir("pedido-nombre", "Sofía");

    expect(guardado()?.note).toBe("Paso a la tarde");
    expect(guardado()?.customerName).toBe("Sofía");
  });

  it("el nombre viaja en el saludo del mensaje", () => {
    montar(pedido());
    escribir("pedido-nombre", "Sofía");

    const enlace = document.querySelector<HTMLAnchorElement>(".pedido__enviar")!;
    const mensaje = decodeURIComponent(enlace.href.split("?text=")[1]!);
    expect(mensaje).toContain("Soy Sofía");
  });

  it("quitar la última línea deja el pedido vacío", () => {
    montar(pedido());
    document.querySelector<HTMLButtonElement>(".renglon__quitar")!.click();
    expect(document.querySelector(".pedido__vacio")).not.toBeNull();
  });

  // Una línea de algo que se dejó de vender no puede llegar al mensaje: el
  // catálogo no tiene el producto 99.
  it("saca del pedido lo que ya no está en el catálogo", () => {
    montar(
      pedido({
        items: [
          { productId: 1, optionId: 1, qty: 1 },
          { productId: 99, qty: 1 },
        ],
      }),
    );
    expect(document.querySelectorAll(".renglon")).toHaveLength(1);
    expect(guardado()?.items).toHaveLength(1);
  });

  it("un pedido ya enviado muestra que falta la confirmación", () => {
    montar(pedido({ sentAt: new Date().toISOString() }));
    expect(document.querySelector(".pedido__enviado")).not.toBeNull();
    expect(document.body.textContent).toContain("no está reservado");
    // Y no se puede volver a mandar el mismo pedido.
    expect(
      document.querySelector<HTMLElement>("[data-pedido-envio]")!.hidden,
    ).toBe(true);
  });

  it("empezar otro pedido borra el guardado", () => {
    montar(pedido({ sentAt: new Date().toISOString() }));
    document.querySelector<HTMLButtonElement>(".pedido__otro")!.click();
    expect(guardado()).toBeNull();
    expect(document.querySelector(".pedido__vacio")).not.toBeNull();
  });

  it("se entera de lo que se suma desde la misma página", () => {
    // Vaciar el pedido desde el panel y después sumar desde la tienda: el
    // panel tiene que mostrar lo nuevo, igual que la barra de abajo.
    montar(pedido({ items: [] }));
    expect(document.querySelector(".pedido__vacio")).not.toBeNull();

    const nuevo = pedido();
    localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(nuevo));
    document.dispatchEvent(
      new CustomEvent("falco:pedido", { detail: { pedido: nuevo } }),
    );

    expect(document.querySelector(".pedido__vacio")).toBeNull();
    expect(document.querySelectorAll(".renglon")).toHaveLength(1);
  });

  it("sacar con la cruz avisa el cambio, para que la barra no quede vieja", () => {
    montar(pedido());
    const avisos: unknown[] = [];
    document.addEventListener("falco:pedido", (e) =>
      avisos.push((e as CustomEvent).detail.pedido),
    );
    document.querySelector<HTMLButtonElement>(".renglon__quitar")!.click();
    expect(avisos).toHaveLength(1);
    expect((avisos[0] as Order).items).toHaveLength(0);
  });

  it("en el panel vacío, ir a la tienda cierra el panel en vez de navegar", () => {
    montar(null);
    const ir = document.querySelector<HTMLAnchorElement>(".pedido__vacio a")!;
    expect(ir.hasAttribute("data-pedido-volver")).toBe(true);
  });
});
