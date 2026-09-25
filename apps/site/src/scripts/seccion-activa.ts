/**
 * Qué opción de la barra queda prendida: la de la sección que se está
 * mirando.
 *
 * La tienda y "Dónde estamos" son secciones de la home, no páginas, así que
 * la ruta no alcanza para saber dónde está la persona. Se mira qué sección
 * cruzó la línea del 40% de la ventana, de arriba hacia abajo: la última que
 * la cruzó es la actual. Arriba de todo, ninguna (en el menú del celular, se
 * prende "Inicio").
 *
 * Fuera de la home no hay secciones: la barra queda como la dibujó el
 * servidor.
 */

const LINEA = 0.4;

/** El id de la sección a la que apunta un enlace, o "" para el inicio. */
const seccionDe = (href: string): string | null => {
  const url = new URL(href, location.href);
  if (url.pathname !== "/") return null;
  return url.hash.slice(1);
};

export const seccionActual = (
  secciones: readonly HTMLElement[],
  alto: number,
): string => {
  let actual = "";
  for (const seccion of secciones) {
    if (seccion.getBoundingClientRect().top <= alto * LINEA) actual = seccion.id;
  }
  return actual;
};

export const conectarSeccionActiva = (): void => {
  if (location.pathname !== "/") return;

  const enlaces = [
    ...document.querySelectorAll<HTMLAnchorElement>("a[data-seccion]"),
  ];
  const ids = new Set(
    enlaces.map((a) => seccionDe(a.href)).filter((id): id is string => !!id),
  );
  const secciones = [...ids]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null)
    // En el orden en que aparecen en la página, no en el de la barra.
    .sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  if (secciones.length === 0) return;

  let ultima: string | null = null;

  const pintar = () => {
    const actual = seccionActual(secciones, window.innerHeight);
    if (actual === ultima) return;
    ultima = actual;

    for (const enlace of enlaces) {
      const activa = seccionDe(enlace.href) === actual;
      if (activa) enlace.setAttribute("aria-current", "location");
      else enlace.removeAttribute("aria-current");
      // El menú del celular tiene su propia clase para el cartel en negativo.
      if (enlace.closest(".menu__lista")) {
        enlace.classList.toggle("menu__activo", activa);
      }
    }
  };

  let pendiente = false;
  const programar = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(() => {
      pendiente = false;
      pintar();
    });
  };

  pintar();
  window.addEventListener("scroll", programar, { passive: true });
  window.addEventListener("resize", programar);
};
