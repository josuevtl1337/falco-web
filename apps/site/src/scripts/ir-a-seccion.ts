/**
 * Ir a una sección de la home sin tocar la dirección.
 *
 * "La tienda" y "Dónde estamos" son secciones de la home, no páginas. Los
 * enlaces siguen siendo /#tienda y /#donde-estamos (sin JavaScript, o con
 * clic del medio, funcionan igual), pero con JavaScript el clic baja suave
 * hasta la sección y la barra de direcciones queda en falcocafe.com.ar, sin
 * el "#".
 *
 * Desde otra página (la ficha de un producto, el 404) se va a la home y se
 * baja al llegar: el destino viaja en sessionStorage, no en la dirección.
 */

const CLAVE = "falco:ir-a";

/**
 * La sección de la home a la que lleva un enlace: su id, "" para el inicio
 * (arriba de todo), o null si el enlace va a otro lado.
 */
export function seccionDelEnlace(href: string, base: string): string | null {
  const url = new URL(href, base);
  if (url.origin !== new URL(base).origin) return null;
  if (url.pathname !== "/" || url.search) return null;
  return url.hash.slice(1);
}

const comportamiento = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Baja (o sube) hasta la sección. Devuelve false si no existe en esta página. */
function irA(id: string, behavior: ScrollBehavior): boolean {
  if (id === "") {
    window.scrollTo({ top: 0, behavior });
    return true;
  }
  const seccion = document.getElementById(id);
  if (!seccion) return false;
  // scroll-margin-top (global.css) ya descuenta la barra fija.
  seccion.scrollIntoView({ behavior, block: "start" });
  return true;
}

/** La dirección sin el "#": sin recargar y sin sumar una entrada al historial. */
const limpiarDireccion = () => {
  if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
};

export function conectarIrASeccion(): void {
  const enLaHome = location.pathname === "/";

  if (enLaHome) {
    // Llegó con un destino: desde otra página de Falco (sessionStorage), o con
    // el "#" en la dirección (un link viejo, /donde-estamos, uno compartido).
    let pendiente: string | null = location.hash ? location.hash.slice(1) : null;
    try {
      pendiente = sessionStorage.getItem(CLAVE) ?? pendiente;
      sessionStorage.removeItem(CLAVE);
    } catch {
      /* sin sessionStorage (navegación privada estricta): sólo el "#" */
    }
    // La dirección queda limpia de entrada; el salto lo hacemos nosotros,
    // porque sin el "#" el navegador ya no sabe adónde ir. Se repite al
    // terminar de cargar: las fotos de más arriba corren la sección.
    limpiarDireccion();
    if (pendiente) {
      const id = pendiente;
      requestAnimationFrame(() => irA(id, "auto"));
      if (document.readyState !== "complete")
        window.addEventListener("load", () => irA(id, "auto"), { once: true });
    }
    // Y si el "#" cambia sin recargar, se limpia igual.
    window.addEventListener("hashchange", limpiarDireccion);
  }

  document.addEventListener("click", (evento) => {
    if (evento.defaultPrevented || evento.button !== 0) return;
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    const destino = evento.target;
    if (!(destino instanceof Element)) return;

    const enlace = destino.closest<HTMLAnchorElement>("a[href]");
    if (!enlace || (enlace.target && enlace.target !== "_self")) return;
    // Dentro de un panel abierto, "Seguir mirando" cierra el panel (paneles.ts).
    if (enlace.matches("[data-pedido-volver]") && enlace.closest("dialog[open]")) return;

    const id = seccionDelEnlace(enlace.href, location.href);
    if (id === null) return;

    if (enLaHome) {
      if (id !== "" && !document.getElementById(id)) return;
      evento.preventDefault();
      // Desde el menú del celular: primero se cierra, después se baja.
      enlace.closest<HTMLDialogElement>("dialog[open]")?.close();
      irA(id, comportamiento());
      return;
    }

    // Desde otra página: a la home, y que baje al llegar.
    if (id === "") return; // "Inicio" es un enlace común.
    try {
      sessionStorage.setItem(CLAVE, id);
    } catch {
      return; // sin sessionStorage, el enlace con "#" hace el trabajo
    }
    evento.preventDefault();
    location.assign("/");
  });
}
