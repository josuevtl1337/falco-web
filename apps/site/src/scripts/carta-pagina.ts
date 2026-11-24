/**
 * La carta en la web: el buscador y las pestañas de categorías.
 *
 * Todo ya viene armado del servidor; esto sólo esconde lo que no coincide con
 * la búsqueda y prende la pestaña de la categoría que se está mirando. Sin
 * JavaScript la carta se lee entera y las pestañas son enlaces comunes.
 */

/** Sin mayúsculas ni tildes: "cafe" encuentra "Café". */
export const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** Cada palabra de la búsqueda tiene que aparecer, en cualquier orden. */
export const coincide = (texto: string, consulta: string): boolean => {
  const donde = normalizar(texto);
  return normalizar(consulta)
    .split(" ")
    .every((palabra) => donde.includes(palabra));
};

/** La categoría que se está mirando: la última cuyo título ya pasó la barra. */
export const seccionVisible = (
  topes: readonly number[],
  linea: number,
): number => {
  let actual = 0;
  topes.forEach((tope, index) => {
    if (tope <= linea) actual = index;
  });
  return actual;
};

export const conectarCarta = (): void => {
  const barra = document.querySelector<HTMLElement>("[data-carta-barra]");
  const buscador = document.querySelector<HTMLInputElement>("[data-carta-buscar]");
  const vacio = document.querySelector<HTMLElement>("[data-carta-vacio]");
  const secciones = [...document.querySelectorAll<HTMLElement>("[data-carta-seccion]")];
  const pestanas = [...document.querySelectorAll<HTMLAnchorElement>("[data-carta-pestana]")];
  if (!barra || secciones.length === 0) return;

  // --- Las pestañas ---------------------------------------------------------

  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Se va a la sección sin dejar el #id en la dirección, como en la home.
  for (const pestana of pestanas) {
    pestana.addEventListener("click", (evento) => {
      const destino = document.getElementById(pestana.hash.slice(1));
      if (!destino) return;
      evento.preventDefault();
      destino.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block: "start" });
    });
  }

  let prendida = -1;
  const prender = (index: number) => {
    if (index === prendida) return;
    prendida = index;
    pestanas.forEach((pestana, i) => {
      if (i === index) pestana.setAttribute("aria-current", "true");
      else pestana.removeAttribute("aria-current");
    });
    // La pestaña prendida siempre a la vista, aunque la fila scrollee.
    const activa = pestanas[index];
    const fila = activa?.parentElement;
    if (activa && fila && fila.scrollWidth > fila.clientWidth) {
      fila.scrollTo({
        left: activa.offsetLeft - (fila.clientWidth - activa.offsetWidth) / 2,
        behavior: quieto ? "auto" : "smooth",
      });
    }
  };

  let pendiente = false;
  const mirar = () => {
    pendiente = false;
    const visibles = secciones.filter((s) => !s.hidden);
    if (visibles.length === 0) return;
    const linea = barra.getBoundingClientRect().bottom + 24;
    const index = seccionVisible(
      visibles.map((s) => s.getBoundingClientRect().top),
      linea,
    );
    const seccion = visibles[index];
    prender(seccion ? secciones.indexOf(seccion) : 0);
  };
  const alScrollear = () => {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(mirar);
  };
  window.addEventListener("scroll", alScrollear, { passive: true });
  window.addEventListener("resize", alScrollear, { passive: true });
  mirar();

  // --- El buscador ----------------------------------------------------------

  if (!buscador) return;
  const filtrar = () => {
    const consulta = buscador.value;
    let alguno = false;
    for (const seccion of secciones) {
      let enSeccion = false;
      for (const item of seccion.querySelectorAll<HTMLElement>("[data-carta-item]")) {
        const si = coincide(item.dataset.cartaItem ?? "", consulta);
        item.hidden = !si;
        enSeccion ||= si;
      }
      seccion.hidden = !enSeccion;
      alguno ||= enSeccion;
    }
    pestanas.forEach((pestana, i) => {
      pestana.hidden = secciones[i]?.hidden ?? false;
    });
    if (vacio) {
      vacio.hidden = alguno;
      const que = vacio.querySelector("[data-carta-consulta]");
      if (que) que.textContent = consulta.trim();
    }
    alScrollear();
  };
  buscador.addEventListener("input", filtrar);
  // Si el navegador recordó lo escrito al volver atrás, que la carta coincida.
  if (buscador.value) filtrar();
};
