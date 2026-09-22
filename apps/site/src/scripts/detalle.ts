import { abrirDialogo, prepararDialogo } from "./dialogo";

/**
 * El detalle de un producto se abre como panel, sin salir de la tienda.
 *
 * La ficha sigue siendo un enlace de verdad a /tienda/<slug>: si el navegador
 * no corre este script -o si alguien comparte el enlace, o lo abre en otra
 * pestaña- esa página existe y muestra el mismo detalle. Acá sólo se
 * intercepta el clic para abrirlo encima, y se empuja la URL al historial para
 * que "atrás" cierre el panel en vez de sacarte del sitio.
 */

const RUTA = /^\/tienda\/([^/?#]+)\/?$/;

const panelDe = (slug: string): HTMLDialogElement | null =>
  document.querySelector<HTMLDialogElement>(
    `[data-panel-producto="${CSS.escape(slug)}"]`,
  );

const abierto = (): HTMLDialogElement | null =>
  document.querySelector<HTMLDialogElement>(".panel-detalle[open]");

export const conectarDetalle = (): void => {
  const paneles = [
    ...document.querySelectorAll<HTMLDialogElement>(".panel-detalle"),
  ];
  if (paneles.length === 0) return;

  // El fondo, el Escape y el candado del scroll son los mismos de siempre; acá
  // no hay disparador propio porque abre el enlace de la ficha.
  for (const panel of paneles) prepararDialogo(panel);

  const abrir = (panel: HTMLDialogElement) => {
    abierto()?.close();
    abrirDialogo(panel);
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

    const enlace = destino.closest<HTMLAnchorElement>('a[href^="/tienda/"]');
    if (!enlace || enlace.target === "_blank") return;

    const slug = RUTA.exec(new URL(enlace.href, location.href).pathname)?.[1];
    if (!slug) return;

    const panel = panelDe(slug);
    if (!panel) return;

    evento.preventDefault();
    abrir(panel);
    history.pushState({ producto: slug }, "", enlace.href);
  });

  // Cerrar el panel deshace el paso del historial, para no dejar dos entradas
  // por cada producto que alguien mira.
  for (const panel of paneles) {
    panel.addEventListener("close", () => {
      if (history.state?.producto === panel.dataset.panelProducto) {
        history.back();
      }
    });
  }

  // "Atrás" y "adelante": el panel sigue a la URL, no al revés.
  window.addEventListener("popstate", (evento) => {
    const slug = (evento.state as { producto?: string } | null)?.producto;
    const panel = slug ? panelDe(slug) : null;

    if (panel) {
      abrir(panel);
      return;
    }

    const visible = abierto();
    if (visible) visible.close();
  });
};
