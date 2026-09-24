import {
  buildOrderMessage,
  buildWhatsAppUrl,
  clearOrder,
  formatArs,
  loadOrder,
  markSent,
  orderTotal,
  pruneUnavailable,
  removeItem,
  saveOrder,
  setCustomer,
  setQty,
  unitCount,
  type Order,
} from "@falco/domain";
import {
  lineIsAvailable,
  readCatalogPayload,
  toCatalog,
  type CatalogPayload,
} from "./catalogo";
import { elemento, poner } from "./dom";

/**
 * La pantalla del pedido.
 *
 * Se dibuja en el navegador y no en el servidor porque el pedido vive en el
 * navegador: el servidor no sabe -ni tiene por qué saber- qué sumó cada uno.
 * Lo que sí pone el servidor es el catálogo, contra el que se cruzan los ids
 * guardados.
 */

const almacenamiento = (): Storage | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const plural = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`;

export const conectarPantallaDePedido = (): void => {
  const raiz = document.querySelector<HTMLElement>("[data-pedido-pantalla]");
  if (!raiz) return;

  const payload: CatalogPayload = readCatalogPayload();
  const catalog = toCatalog(payload);
  const whatsapp = payload.whatsapp;

  /**
   * Todo cambio hecho desde la pantalla se avisa: si no, la barra de abajo y
   * los paneles de producto se quedaban con el pedido viejo hasta recargar.
   */
  const guardar = (order: Order) => {
    saveOrder(almacenamiento(), order);
    avisarCambio(order);
    dibujar();
  };

  const leer = (): Order | null => {
    const ahora = new Date();
    const order = loadOrder(almacenamiento(), ahora);
    if (!order) return null;

    // Antes de mostrar nada: sacar lo que ya no se vende. Si algo se fue, el
    // pedido guardado cambia, así que se vuelve a guardar.
    const limpio = pruneUnavailable(order, lineIsAvailable(payload), ahora);
    if (limpio !== order) saveOrder(almacenamiento(), limpio);
    return limpio;
  };

  const enlaceDeChat = (order: Order): string | undefined => {
    if (!whatsapp) return undefined;
    const mensaje = buildOrderMessage(order, catalog);
    if (!mensaje) return undefined;
    try {
      return buildWhatsAppUrl(whatsapp, mensaje);
    } catch {
      // El número cargado en el admin no sirve: mejor no ofrecer un enlace
      // roto que lleve a ningún lado.
      return undefined;
    }
  };

  function dibujarVacio(): HTMLElement {
    const caja = document.createElement("div");
    caja.className = "pedido__vacio";
    poner(
      caja,
      elemento(
        "p",
        "pedido__vacio-texto",
        "Todavía no sumaste nada. Elegí algo de la tienda y armá tu pedido.",
      ),
    );
    const ir = document.createElement("a");
    ir.className = "boton";
    ir.href = "/#tienda";
    // Dentro del panel cierra el panel en vez de navegar (y recargar la home);
    // en la página /pedido sigue siendo un enlace normal a la tienda.
    ir.dataset.pedidoVolver = "";
    ir.textContent = "Ir a la tienda";
    poner(caja, ir);
    return caja;
  }

  function dibujarEnviado(order: Order): HTMLElement {
    const caja = document.createElement("section");
    caja.className = "pedido__enviado";
    caja.setAttribute("aria-live", "polite");

    poner(caja, elemento("h2", "pedido__titulo", "Esperando confirmación"));

    const cuerpo = document.createElement("p");
    cuerpo.className = "pedido__parrafo";
    poner(
      cuerpo,
      document.createTextNode("Mandaste el pedido "),
      elemento("b", "pedido__codigo", order.code),
      document.createTextNode(
        " por WhatsApp. Falco te va a confirmar si hay stock y desde qué hora lo podés retirar. Hasta que te respondan, ",
      ),
      elemento("b", "", "no está reservado"),
      document.createTextNode("."),
    );
    poner(caja, cuerpo);

    const acciones = document.createElement("div");
    acciones.className = "pedido__acciones";

    const url = enlaceDeChat(order);
    if (url) {
      const volver = document.createElement("a");
      volver.className = "boton";
      volver.href = url;
      volver.target = "_blank";
      volver.rel = "noopener";
      volver.textContent = "Volver al chat";
      poner(acciones, volver);
    }

    const otro = document.createElement("button");
    otro.type = "button";
    otro.className = "pedido__otro";
    otro.textContent = "Empezar otro pedido";
    otro.addEventListener("click", () => {
      clearOrder(almacenamiento());
      avisarCambio(null);
      dibujar();
    });
    poner(acciones, otro);

    poner(caja, acciones);
    return caja;
  }

  function dibujarLinea(order: Order, line: Order["items"][number]) {
    const product = catalog.get(line.productId);
    if (!product) return null;

    const option = product.options?.find((o) => o.id === line.optionId);
    const key = { productId: line.productId, optionId: line.optionId };

    const fila = document.createElement("li");
    fila.className = "renglon";

    const main = document.createElement("div");
    main.className = "renglon__main";
    poner(main, elemento("b", "", product.name));
    poner(
      main,
      elemento(
        "small",
        "",
        [product.detail, option?.label].filter(Boolean).join(" · "),
      ),
    );
    // La clase .precio existe justamente para esto: cada precio entero, sin
    // que "$ 13.000" quede cortado de "tarjeta" en la línea de abajo.
    const precio = elemento("p", "precio");
    poner(
      precio,
      elemento(
        "span",
        "",
        `${formatArs(product.priceCashArs * line.qty)} efectivo`,
      ),
      elemento(
        "span",
        "",
        `${formatArs(product.priceCardArs * line.qty)} tarjeta`,
      ),
    );
    poner(
      main,
      precio,
    );
    poner(fila, main);

    const cantidad = document.createElement("div");
    cantidad.className = "cantidad renglon__cantidad";
    const menos = document.createElement("button");
    menos.type = "button";
    menos.className = "cantidad__boton";
    menos.textContent = "−";
    menos.setAttribute("aria-label", `Quitar una unidad de ${product.name}`);
    menos.addEventListener("click", () =>
      guardar(setQty(order, key, line.qty - 1, new Date())),
    );

    const valor = document.createElement("b");
    valor.textContent = String(line.qty);

    const mas = document.createElement("button");
    mas.type = "button";
    mas.className = "cantidad__boton";
    mas.textContent = "+";
    mas.setAttribute("aria-label", `Sumar una unidad de ${product.name}`);
    mas.addEventListener("click", () =>
      guardar(setQty(order, key, line.qty + 1, new Date())),
    );

    poner(cantidad, menos, valor, mas);
    poner(fila, cantidad);

    const quitar = document.createElement("button");
    quitar.type = "button";
    quitar.className = "renglon__quitar";
    quitar.textContent = "✕";
    quitar.setAttribute("aria-label", `Sacar ${product.name} del pedido`);
    quitar.addEventListener("click", () =>
      guardar(removeItem(order, key, new Date())),
    );
    poner(fila, quitar);

    return fila;
  }

  function dibujarArmado(order: Order): HTMLElement {
    const caja = document.createElement("div");
    caja.className = "pedido__armado";

    const lista = document.createElement("ul");
    lista.className = "pedido__lista";
    for (const line of order.items) {
      const fila = dibujarLinea(order, line);
      if (fila) poner(lista, fila);
    }
    poner(caja, lista);

    const totales = orderTotal(order, catalog);
    const total = document.createElement("div");
    total.className = "pedido__total";
    poner(total, elemento("span", "", "Total estimado"));
    const numeros = document.createElement("p");
    numeros.className = "pedido__numeros";
    poner(
      numeros,
      elemento("b", "", `${formatArs(totales.cash)} efectivo`),
      elemento("small", "", `${formatArs(totales.card)} tarjeta`),
    );
    poner(total, numeros);
    poner(caja, total);

    poner(
      caja,
      campo("Tu nombre", "pedido-nombre", order.customerName ?? "", (valor) =>
        guardarDato("customerName", valor),
      ),
    );
    poner(
      caja,
      campo("Algo más (opcional)", "pedido-nota", order.note ?? "", (valor) =>
        guardarDato("note", valor),
      ),
    );

    const retiro = document.createElement("div");
    retiro.className = "pedido__retiro";
    poner(retiro, elemento("span", "chip chip--fill", "Retiro en el local"));
    poner(
      retiro,
      elemento("p", "", "Iriondo 2153 · Santo Tomé, Santa Fe. No enviamos."),
    );
    poner(caja, retiro);

    return caja;
  }

  /**
   * Los datos del cliente se guardan al salir del campo y no en cada tecla:
   * escribir "Sofía" son cinco escrituras a localStorage y cinco redibujados
   * que le sacarían el foco al propio campo.
   */
  function campo(
    etiqueta: string,
    id: string,
    valor: string,
    alSalir: (valor: string) => void,
  ): HTMLElement {
    const caja = document.createElement("label");
    caja.className = "campo";
    caja.htmlFor = id;
    poner(caja, elemento("span", "", etiqueta));

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.value = valor;
    input.autocomplete = id === "pedido-nombre" ? "name" : "off";
    input.addEventListener("change", () => alSalir(input.value));
    poner(caja, input);
    return caja;
  }

  /**
   * Guarda UN dato del cliente releyendo el pedido del momento.
   *
   * No puede quedarse con el `order` que había cuando se dibujó el campo: los
   * dos campos se dibujan a la vez y `setCustomer` pisa los dos valores, así
   * que el segundo en cambiar guardaría el nombre viejo -vacío- sobre el que
   * la persona acababa de escribir. Pasó de verdad: se escribía el nombre,
   * después el comentario, y el mensaje salía sin nombre.
   */
  function guardarDato(clave: "customerName" | "note", valor: string) {
    const actual = leer();
    if (!actual) return;

    const siguiente = setCustomer(
      actual,
      {
        customerName: actual.customerName,
        note: actual.note,
        [clave]: valor,
      },
      new Date(),
    );
    saveOrder(almacenamiento(), siguiente);
    // A propósito NO se redibuja: el cambio ya está guardado y redibujar acá
    // le sacaría el foco al campo que la persona acaba de dejar.
    actualizarEnvio(siguiente);
  }

  function actualizarEnvio(order: Order | null) {
    const pie = raiz!.querySelector<HTMLElement>("[data-pedido-envio]");
    if (!pie) return;

    pie.replaceChildren();
    if (!order || order.items.length === 0 || order.sentAt) {
      pie.hidden = true;
      return;
    }
    pie.hidden = false;

    const url = enlaceDeChat(order);
    if (!url) {
      poner(
        pie,
        elemento(
          "p",
          "pedido__sin-whatsapp",
          "Todavía no cargamos el WhatsApp del local. Escribinos por Instagram y lo resolvemos por ahí.",
        ),
      );
      return;
    }

    const enviar = document.createElement("a");
    enviar.className = "boton pedido__enviar";
    enviar.href = url;
    enviar.target = "_blank";
    enviar.rel = "noopener";
    enviar.textContent = "Enviar para confirmar";
    enviar.addEventListener("click", () => {
      // Se marca como enviado al tocar, no al volver: puede que no vuelva.
      const enviado = markSent(order, new Date());
      saveOrder(almacenamiento(), enviado);
      avisarCambio(enviado);
      // El redibujado va después del click para no pisar la navegación.
      setTimeout(dibujar, 0);
    });
    poner(pie, enviar);

    poner(
      pie,
      elemento(
        "p",
        "pedido__letra-chica",
        "Se abre WhatsApp con el mensaje escrito. Acá no se cobra nada.",
      ),
    );
    poner(
      pie,
      elemento(
        "p",
        "pedido__letra-chica",
        "Respondemos en el horario del local, normalmente en unos minutos.",
      ),
    );
  }

  /**
   * Mientras la propia pantalla avisa, no se escucha a sí misma: redibujar en
   * medio del click de "Enviar para confirmar" sacaría el enlace del DOM antes
   * de que el navegador lo siga, y WhatsApp no se abriría.
   */
  let avisando = false;

  function avisarCambio(order: Order | null) {
    avisando = true;
    try {
      document.dispatchEvent(
        new CustomEvent("falco:pedido", { detail: { pedido: order } }),
      );
    } finally {
      avisando = false;
    }
  }

  function dibujar() {
    const order = leer();
    const cuerpo = raiz!.querySelector<HTMLElement>("[data-pedido-cuerpo]");
    const pasos = raiz!.querySelector<HTMLElement>("[data-pedido-pasos]");
    if (!cuerpo) return;

    if (!order || order.items.length === 0) {
      cuerpo.replaceChildren(dibujarVacio());
      if (pasos) pasos.hidden = true;
    } else if (order.sentAt) {
      cuerpo.replaceChildren(dibujarEnviado(order));
      if (pasos) {
        pasos.hidden = false;
        marcarPaso(pasos, 2);
      }
    } else {
      cuerpo.replaceChildren(dibujarArmado(order));
      if (pasos) {
        pasos.hidden = false;
        marcarPaso(pasos, 1);
      }
    }

    const resumen = raiz!.querySelector<HTMLElement>("[data-pedido-resumen]");
    if (resumen) {
      resumen.textContent =
        order && order.items.length > 0
          ? `${plural(unitCount(order), "unidad", "unidades")} · ${order.code}`
          : "";
    }

    actualizarEnvio(order);
  }

  function marcarPaso(pasos: HTMLElement, actual: number) {
    for (const paso of pasos.querySelectorAll<HTMLElement>("[data-paso]")) {
      const numero = Number(paso.dataset.paso);
      paso.classList.toggle("paso--ahora", numero === actual);
      paso.classList.toggle("paso--hecho", numero < actual);
    }
  }

  dibujar();

  // En la home la pantalla vive en un panel que se dibuja una vez al cargar:
  // sin esto, sumar desde la tienda después de vaciar el pedido dejaba el panel
  // diciendo "Todavía no sumaste nada" mientras la barra mostraba la unidad.
  document.addEventListener("falco:pedido", () => {
    if (!avisando) dibujar();
  });

  // Si el pedido cambia en otra pestaña, esta se entera.
  window.addEventListener("storage", dibujar);
};
