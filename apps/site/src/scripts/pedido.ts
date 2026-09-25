import {
  addItem,
  createOrder,
  generateOrderCode,
  loadOrder,
  saveOrder,
  unitsForProduct,
  type AddOutcome,
  type Order,
} from "@falco/domain";
import { mostrarAviso } from "./aviso";

/** La letra chica que el panel muestra mientras no haya nada que contestar. */
const AVISO_BASE = "El stock se confirma por WhatsApp antes de retirar";

/**
 * Los paneles de detalle: elegir la molienda, la cantidad y sumar al pedido.
 *
 * Va por delegación sobre todo el documento y no como una isla por producto:
 * en la home hay un panel por cada producto del catálogo, y montar una isla de
 * React en cada uno serían siete raíces para un puñado de botones. La lógica
 * del pedido ya vive, probada, en @falco/domain.
 */

const almacenamiento = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    // El navegador tiene el almacenamiento bloqueado (ventana privada, o el
    // usuario lo apagó): el pedido no se guarda, pero la página no se rompe.
    return null;
  }
};

const pedidoActual = (ahora: Date): Order =>
  loadOrder(almacenamiento(), ahora) ?? createOrder(generateOrderCode(), ahora);

/** Cuántas unidades se pueden sumar todavía de este producto. */
const margen = (panel: HTMLElement, ahora: Date): number => {
  const tope = Number(panel.dataset.tope ?? 2);
  const id = Number(panel.dataset.producto);
  return Math.max(0, tope - unitsForProduct(pedidoActual(ahora), id));
};

const AVISOS: Record<AddOutcome, string> = {
  added: "Sumado al pedido",
  increased: "Sumado al pedido",
  unit_limit: "Ya tenés el máximo de este producto",
  product_limit: "El pedido llegó a su tope de productos",
  already_sent: "Ese pedido ya se envió: empezá otro",
};

const TONOS: Record<AddOutcome, string> = {
  added: "bien",
  increased: "bien",
  unit_limit: "tope",
  product_limit: "tope",
  already_sent: "tope",
};

const avisar = (panel: HTMLElement, texto: string, tono: string) => {
  const aviso = panel.querySelector<HTMLElement>("[data-aviso]");
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.dataset.tono = tono;
};

const leerCantidad = (panel: HTMLElement): number =>
  Number(panel.querySelector<HTMLElement>("[data-cantidad-valor]")?.textContent ?? 1);

const escribirCantidad = (panel: HTMLElement, valor: number) => {
  const campo = panel.querySelector<HTMLElement>("[data-cantidad-valor]");
  if (campo) campo.textContent = String(valor);

  // Los botones que no pueden hacer nada se apagan, en vez de no responder.
  const disponible = margen(panel, new Date());
  const menos = panel.querySelector<HTMLButtonElement>('[data-cantidad="-1"]');
  const mas = panel.querySelector<HTMLButtonElement>('[data-cantidad="1"]');
  if (menos) menos.disabled = valor <= 1;
  if (mas) mas.disabled = valor >= Math.max(1, disponible);
};

const panelDe = (destino: EventTarget | null): HTMLElement | null =>
  destino instanceof Element ? destino.closest(".detalle") : null;

export const conectarPedido = (): void => {
  // Si el aviso lo dispara este mismo archivo, el panel que sumó ya está al
  // día y tiene su propio mensaje: no hay que pisarlo.
  let avisando = false;

  document.addEventListener("click", (evento) => {
    const destino = evento.target;
    if (!(destino instanceof Element)) return;

    const panel = panelDe(destino);
    if (!panel) return;

    // Elegir la molienda: sólo una queda marcada dentro del mismo panel.
    const opcion = destino.closest<HTMLButtonElement>("[data-opcion]");
    if (opcion && !opcion.disabled) {
      for (const otra of panel.querySelectorAll<HTMLElement>("[data-opcion]")) {
        otra.setAttribute("aria-pressed", String(otra === opcion));
      }
      return;
    }

    // Subir o bajar la cantidad, sin pasarse de lo que queda disponible.
    const paso = destino.closest<HTMLButtonElement>("[data-cantidad]");
    if (paso) {
      const disponible = Math.max(1, margen(panel, new Date()));
      const siguiente = leerCantidad(panel) + Number(paso.dataset.cantidad);
      escribirCantidad(panel, Math.min(disponible, Math.max(1, siguiente)));
      return;
    }

    if (!destino.closest("[data-sumar]")) return;

    // Sumar: una llamada por unidad, porque el dominio cuenta de a una y es él
    // quien conoce los topes. El primer resultado que no sea un alta corta.
    const ahora = new Date();
    const cantidad = leerCantidad(panel);
    const productId = Number(panel.dataset.producto);
    const elegida = panel.querySelector<HTMLElement>(
      '[data-opcion][aria-pressed="true"]',
    );
    const optionId = elegida ? Number(elegida.dataset.opcion) : undefined;

    let pedido = pedidoActual(ahora);
    let resultado: AddOutcome = "added";
    let sumadas = 0;
    for (let i = 0; i < cantidad; i++) {
      const paso = addItem(pedido, { productId, optionId }, ahora);
      pedido = paso.order;
      resultado = paso.outcome;
      if (resultado !== "added" && resultado !== "increased") break;
      sumadas++;
    }

    const guardado = saveOrder(almacenamiento(), pedido);
    if (!guardado) {
      avisar(
        panel,
        "No pudimos guardar el pedido en este navegador",
        "tope",
      );
      return;
    }

    // Lo que salió bien se dice con el cartel de arriba, que se ve aunque el
    // panel se cierre; lo que no entró se dice dentro del panel, al lado del
    // producto del que estamos hablando.
    //
    // Si entró una parte (pidió 2 y el tope dejaba 1), lo que entró se dice
    // igual: decir sólo "ya tenés el máximo" hacía creer que no se sumó nada.
    const sumado = sumadas > 0;
    if (sumado) {
      const producto = [panel.dataset.nombre, panel.dataset.detalle]
        .filter(Boolean)
        .join(" · ");
      mostrarAviso(
        "¡Sumado!",
        sumadas < cantidad
          ? `${producto} · entraron ${sumadas} de ${cantidad}: ${AVISOS[resultado].toLowerCase()}`
          : producto,
      );
      avisar(panel, AVISO_BASE, "");
    } else {
      avisar(panel, AVISOS[resultado], TONOS[resultado]);
    }

    escribirCantidad(panel, 1);
    avisando = true;
    try {
      document.dispatchEvent(
        new CustomEvent("falco:pedido", { detail: { pedido } }),
      );
    } finally {
      avisando = false;
    }

    // Sumar cierra el panel y devuelve a la tienda, como en la lámina: el
    // gesto terminó, y el cartel de arriba más la barra de abajo ya dicen que
    // salió bien. Si NO entró, el panel se queda abierto: el motivo está ahí
    // adentro y hay algo que decidir.
    //
    // Se avisa con un evento en vez de llamar a close() acá: cerrar un panel
    // es además soltar el candado del scroll y deshacer el paso del historial,
    // y eso lo sabe detalle.ts, que es quien lo abrió.
    if (sumado) {
      document.dispatchEvent(new CustomEvent("falco:cerrar-panel"));
    }
  });

  // Al abrir un panel, la cantidad vuelve a 1 y los botones se recalculan
  // contra lo que ya hay en el pedido.
  const paneles = [...document.querySelectorAll<HTMLElement>(".detalle")];
  for (const panel of paneles) {
    escribirCantidad(panel, 1);
  }

  // Cada vez que se abre un panel arranca de cero: cantidad 1, botones
  // recalculados contra el pedido y sin el cartel de la vez anterior.
  document.addEventListener("falco:panel-abierto", (evento) => {
    const panel =
      evento.target instanceof Element
        ? evento.target.querySelector<HTMLElement>(".detalle")
        : null;
    if (!panel || panel.querySelector("[data-sumar]:disabled")) return;
    escribirCantidad(panel, 1);
    avisar(panel, AVISO_BASE, "");
  });

  // El pedido cambió desde otro lado (se sacó algo, se vació, se empezó otro):
  // los topes y los carteles de cada producto se recalculan sin recargar.
  document.addEventListener("falco:pedido", () => {
    if (avisando) return;
    for (const panel of paneles) {
      // Uno sin stock tiene su propio cartel, que no depende del pedido.
      if (panel.querySelector("[data-sumar]:disabled")) continue;
      escribirCantidad(panel, 1);
      if (panel.querySelector<HTMLElement>("[data-aviso]")?.dataset.tono) {
        avisar(panel, AVISO_BASE, "");
      }
    }
  });
};
