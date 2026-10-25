/**
 * El riel de la tienda andando también en el celular.
 *
 * En la compu lo mueve una animación de CSS sobre `transform`, que frena con
 * el mouse encima. En una pantalla táctil eso no sirve: una fila movida con
 * `transform` no se puede arrastrar con el dedo. Acá se mueve el scroll del
 * riel, de a poco, así la misma fila anda sola y también se arrastra.
 *
 * - Al tocarla frena; al soltarla espera un rato (y que termine la inercia
 *   del deslizamiento) y sigue desde donde quedó.
 * - Es un bucle: la tanda de fichas va dos veces, y al llegar a un borde el
 *   scroll salta exactamente una tanda, que se ve igual.
 * - Fuera de pantalla no corre, y con "reducir movimiento" no arranca.
 */

const PAUSA_AL_SOLTAR = 2500;

/**
 * La posición dentro del bucle: si se pasó de un borde, la misma vista una
 * tanda más allá. `maximo` es lo más lejos que puede ir el scroll.
 */
export const envolver = (
  pos: number,
  tanda: number,
  maximo: number,
): number => {
  if (pos <= 0) return pos + tanda;
  if (pos >= maximo) return pos - tanda;
  return pos;
};

const segundos = (duracion: string): number => {
  const valor = Number.parseFloat(duracion);
  return Number.isFinite(valor) && valor > 0 ? valor : 52;
};

const conectarRiel = (riel: HTMLElement): void => {
  const pista = riel.querySelector<HTMLElement>(".riel__pista");
  const tandaEl = riel.querySelector<HTMLElement>(
    ".riel__tanda:not(.riel__copia)",
  );
  const copia = riel.querySelector<HTMLElement>(".riel__copia");
  if (!pista || !tandaEl || !copia) return;

  const vuelta = pista.classList.contains("riel__pista--vuelta");
  const duracion = segundos(riel.style.getPropertyValue("--riel-duracion"));

  // Se mide en cada cuadro que lo necesita: la ficha cambia de ancho al girar
  // el teléfono y con ella la tanda.
  const tanda = () => copia.offsetLeft - tandaEl.offsetLeft;
  const maximo = () => riel.scrollWidth - riel.clientWidth;

  // La posición se lleva aparte, con decimales: el navegador puede redondear
  // scrollLeft y a menos de un píxel por cuadro el riel no avanzaría nunca.
  let pos = tanda();
  riel.scrollLeft = pos;

  let tocando = false;
  let visible = false;
  let quietoHasta = 0;
  let anterior = 0;
  let cuadro = 0;

  const paso = (ahora: number) => {
    cuadro = 0;
    const dt = anterior ? Math.min(ahora - anterior, 100) : 0;
    anterior = ahora;

    if (!tocando && ahora >= quietoHasta) {
      const medida = tanda();
      const velocidad = medida / duracion / 1000;
      pos = envolver(
        pos + (vuelta ? -1 : 1) * velocidad * dt,
        medida,
        maximo(),
      );
      riel.scrollLeft = pos;
    }
    seguir();
  };

  const seguir = () => {
    if (visible && !cuadro) cuadro = requestAnimationFrame(paso);
  };

  const frenar = () => {
    if (cuadro) cancelAnimationFrame(cuadro);
    cuadro = 0;
    anterior = 0;
  };

  riel.addEventListener(
    "touchstart",
    () => {
      tocando = true;
    },
    { passive: true },
  );

  const soltar = () => {
    tocando = false;
    quietoHasta = performance.now() + PAUSA_AL_SOLTAR;
  };
  riel.addEventListener("touchend", soltar, { passive: true });
  riel.addEventListener("touchcancel", soltar, { passive: true });

  // Lo que mueve la persona (el dedo o la inercia después de soltar): se
  // adopta esa posición, se corre la pausa y se envuelve en los bordes, así
  // tampoco a mano se llega al final de la fila.
  riel.addEventListener(
    "scroll",
    () => {
      if (Math.abs(riel.scrollLeft - pos) < 2) return;
      pos = riel.scrollLeft;
      if (!tocando) quietoHasta = performance.now() + PAUSA_AL_SOLTAR;
      const envuelta = envolver(pos, tanda(), maximo());
      if (envuelta !== pos) {
        pos = envuelta;
        riel.scrollLeft = pos;
      }
    },
    { passive: true },
  );

  new IntersectionObserver(([entrada]) => {
    visible = entrada?.isIntersecting ?? false;
    if (visible) seguir();
    else frenar();
  }).observe(riel);
};

export const conectarRielTactil = (): void => {
  const tactil = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!tactil || quieto) return;

  for (const riel of document.querySelectorAll<HTMLElement>(".riel--anda")) {
    conectarRiel(riel);
  }
};
