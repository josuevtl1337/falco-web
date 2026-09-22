import { loadOrder, unitCount, type Order } from "@falco/domain";

/**
 * La barra del pedido, abajo de todo.
 *
 * Se entera de los cambios por el evento `falco:pedido`, que dispara quien
 * toca el pedido, y por `storage`, que avisa cuando lo tocó otra pestaña.
 */

const almacenamiento = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const plural = (n: number, uno: string, varios: string) =>
  `${n} ${n === 1 ? uno : varios}`;

export const conectarBarraDePedido = (): void => {
  const barra = document.querySelector<HTMLElement>("[data-barra-pedido]");
  if (!barra) return;

  const numero = barra.querySelector<HTMLElement>("[data-barra-n]");
  const detalle = barra.querySelector<HTMLElement>("[data-barra-detalle]");

  const pintar = (order: Order | null) => {
    if (!order || order.items.length === 0) {
      barra.hidden = true;
      return;
    }

    const unidades = unitCount(order);
    barra.hidden = false;
    if (numero) numero.textContent = String(unidades);
    if (detalle) {
      detalle.textContent = order.sentAt
        ? `${plural(unidades, "unidad", "unidades")} · enviado`
        : `${plural(unidades, "unidad", "unidades")} · sin confirmar`;
    }
    barra.setAttribute(
      "aria-label",
      order.sentAt
        ? `Ver tu pedido: ${plural(unidades, "unidad", "unidades")}, ya enviado`
        : `Ver tu pedido: ${plural(unidades, "unidad", "unidades")}, sin confirmar`,
    );
  };

  const releer = () => pintar(loadOrder(almacenamiento(), new Date()));

  releer();

  // Quien cambia el pedido avisa con el detalle ya calculado; si no viene,
  // se relee del almacenamiento.
  document.addEventListener("falco:pedido", (evento) => {
    const detalle = (evento as CustomEvent<{ pedido?: Order | null }>).detail;
    if (detalle && "pedido" in detalle) pintar(detalle.pedido ?? null);
    else releer();
  });

  window.addEventListener("storage", releer);
};
