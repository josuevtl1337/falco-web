import { abrirDialogo, cerrarDialogo, prepararDialogo } from "./dialogo";

/**
 * Los paneles que tienen URL propia: el detalle de un producto y el pedido.
 *
 * Cada panel declara la ruta que representa (`data-panel-ruta`). El enlace que
 * lleva a esa ruta sigue siendo un enlace de verdad -esas páginas existen, se
 * pueden compartir, abrir en otra pestaña y leer sin JavaScript-; acá sólo se
 * intercepta el clic para abrirlas encima, y se empuja la URL al historial
 * para que "atrás" cierre el panel en vez de sacarte del sitio.
 */

/** Cuánto esperamos a que llegue popstate antes de dar el paso por perdido. */
const ESPERA_POPSTATE_MS = 400;

/** La ruta sin barra final, que es como la declaran los paneles. */
const normalizar = (ruta: string): string =>
  ruta.length > 1 && ruta.endsWith("/") ? ruta.slice(0, -1) : ruta;

const panelDe = (ruta: string): HTMLDialogElement | null =>
  document.querySelector<HTMLDialogElement>(
    `[data-panel-ruta="${CSS.escape(normalizar(ruta))}"]`,
  );

const abierto = (): HTMLDialogElement | null =>
  document.querySelector<HTMLDialogElement>("dialog[data-panel-ruta][open]");

export const conectarPaneles = (): void => {
  const paneles = [
    ...document.querySelectorAll<HTMLDialogElement>("dialog[data-panel-ruta]"),
  ];
  if (paneles.length === 0) return;

  /*
   * La guarda contra reentrada, y por qué es una bandera y no una comprobación
   * del historial.
   *
   * Cerrar un panel llega por varios caminos a la vez: el evento `close`, el
   * botón de cerrar, el click en el fondo y nuestro propio "sumé, cerrá".
   * Todos quieren deshacer el paso del historial, y todos corren en el mismo
   * turno.
   *
   * La versión anterior se protegía preguntando `history.state`. No sirve:
   * `history.back()` es ASÍNCRONO -el estado recién cambia cuando llega
   * popstate- así que todas las llamadas del turno veían el estado viejo y
   * todas retrocedían. Medido con clicks reales: cuatro `history.back()` por
   * un solo cierre, y la persona terminaba en el inicio de la home después de
   * sumar un producto desde la tienda.
   *
   * Una bandera síncrona sí protege, porque se pone antes de ceder el control.
   */
  let volviendo = false;

  /*
   * Al cerrarse un diálogo, el navegador le devuelve el foco a lo que lo
   * abrió: la ficha, que vive adentro del riel. Y el riel se pausa con el
   * foco adentro (:focus-within, para quien recorre con el teclado), así que
   * quedaba frenado aunque el mouse estuviera en otro lado.
   *
   * Si el panel se abrió con el mouse o el dedo, al cerrarlo se suelta ese
   * foco. Si se abrió con el teclado, se deja: ahí la pausa es lo correcto.
   */
  let abiertoConPuntero = false;

  const soltarFocoDelRiel = () => {
    if (!abiertoConPuntero) return;
    // Después de que el navegador devolvió el foco, no antes.
    requestAnimationFrame(() => {
      const activo = document.activeElement;
      if (activo instanceof HTMLElement && activo.closest(".riel")) activo.blur();
    });
  };

  const abrir = (panel: HTMLDialogElement) => {
    const previo = abierto();
    // Cambiar de un panel a otro no toca el historial: el pushState que viene
    // lo reemplaza igual.
    if (previo && previo !== panel) cerrarDialogo(previo);
    abrirDialogo(panel);
    // Quien arma el contenido del panel (pedido.ts) lo deja como nuevo.
    panel.dispatchEvent(new CustomEvent("falco:panel-abierto", { bubbles: true }));
  };

  /**
   * Alguien cerró el panel: se cierra y se deshace nuestro paso del historial.
   * El cierre de verdad lo termina popstate.
   */
  const pedirCierre = (panel: HTMLDialogElement) => {
    if (volviendo) return;

    const esNuestroPaso = history.state?.panel === panel.dataset.panelRuta;

    if (panel.open) cerrarDialogo(panel);
    soltarFocoDelRiel();
    if (!esNuestroPaso) return;

    volviendo = true;
    history.back();

    // Red de seguridad: si no hubiera entrada previa, popstate no llega nunca
    // y la bandera quedaría trabada, dejando el panel imposible de cerrar.
    window.setTimeout(() => {
      volviendo = false;
    }, ESPERA_POPSTATE_MS);
  };

  document.addEventListener("click", (evento) => {
    // Respetamos los atajos del navegador: ctrl/cmd/shift-clic y el botón del
    // medio abren en otra pestaña, y ahí el panel no tiene nada que hacer.
    if (evento.defaultPrevented) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey)
      return;
    if (evento.button !== 0) return;

    const destino = evento.target;
    if (!(destino instanceof Element)) return;

    // Un enlace de cerrar dentro de un panel abierto no abre nada: cierra.
    const cerrar = destino.closest<HTMLElement>("[data-pedido-volver]");
    const panelDelCerrar = cerrar?.closest<HTMLDialogElement>("dialog[open]");
    if (panelDelCerrar) {
      evento.preventDefault();
      pedirCierre(panelDelCerrar);
      return;
    }

    const enlace = destino.closest<HTMLAnchorElement>("a[href]");
    if (!enlace || enlace.target === "_blank") return;

    const destinoUrl = new URL(enlace.href, location.href);
    if (destinoUrl.origin !== location.origin) return;

    const panel = panelDe(destinoUrl.pathname);
    if (!panel) return;

    evento.preventDefault();
    abiertoConPuntero = evento.detail > 0;
    abrir(panel);
    history.pushState(
      { panel: panel.dataset.panelRuta },
      "",
      destinoUrl.pathname,
    );
  });

  // Los tres caminos por los que el navegador cierra un panel (el evento, el
  // botón de cerrar y el click en el fondo) pasan todos por acá.
  for (const panel of paneles) {
    prepararDialogo(panel, () => pedirCierre(panel));
  }

  // Y el cierre que pedimos nosotros, al sumar al pedido.
  document.addEventListener("falco:cerrar-panel", (evento) => {
    const ruta = (evento as CustomEvent<{ ruta?: string }>).detail?.ruta;
    const panel = ruta ? panelDe(ruta) : abierto();
    if (panel) pedirCierre(panel);
  });

  /*
   * "Atrás" y "adelante": el panel sigue a la URL, no al revés.
   *
   * Acá NO se toca el historial -ya estamos dentro de un movimiento suyo- y se
   * baja la bandera, que es lo que permite el próximo cierre.
   */
  window.addEventListener("popstate", (evento) => {
    volviendo = false;

    const ruta = (evento.state as { panel?: string } | null)?.panel;
    const panel = ruta ? panelDe(ruta) : null;

    if (panel) {
      abrir(panel);
      return;
    }

    const visible = abierto();
    if (visible) {
      cerrarDialogo(visible);
      soltarFocoDelRiel();
    }
  });
};
