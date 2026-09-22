/**
 * Lo poco que un <dialog> nativo no resuelve solo.
 *
 * showModal() ya pone el fondo, atrapa el foco adentro, cierra con Escape y
 * deja inerte el resto de la página. Falta bloquear el scroll del documento
 * (que no todos los navegadores hacen) y cerrar al tocar afuera.
 */

/**
 * El candado del scroll, con contador.
 *
 * Con un booleano, cerrar un diálogo abierto sobre otro desbloquearía el
 * scroll aunque el de abajo siguiera abierto. El contador sólo suelta el
 * candado cuando se cerró el último.
 */
export const crearBloqueoDeScroll = (raiz: HTMLElement) => {
  let abiertos = 0;

  return {
    tomar() {
      abiertos += 1;
      raiz.style.overflow = "hidden";
    },
    soltar() {
      // Nunca por debajo de cero: un "soltar" de más no puede dejar el
      // contador en negativo y hacer que el próximo "tomar" no bloquee.
      abiertos = Math.max(0, abiertos - 1);
      if (abiertos === 0) raiz.style.overflow = "";
    },
    get abiertos() {
      return abiertos;
    },
  };
};

/**
 * ¿El click cayó fuera de la caja del diálogo, es decir, en el fondo?
 *
 * El click del fondo tiene como objetivo al propio <dialog>, pero el click
 * sobre el relleno del diálogo también: hay que mirar además las coordenadas,
 * o tocar el borde interno lo cerraría.
 */
export const clickEnElFondo = (
  dialogo: HTMLDialogElement,
  evento: MouseEvent,
): boolean => {
  if (evento.target !== dialogo) return false;

  const caja = dialogo.getBoundingClientRect();
  return (
    evento.clientX < caja.left ||
    evento.clientX > caja.right ||
    evento.clientY < caja.top ||
    evento.clientY > caja.bottom
  );
};

const bloqueo = crearBloqueoDeScroll(document.documentElement);

/** Conecta un botón con su diálogo modal. */
export const conectarDialogo = (
  dialogo: HTMLDialogElement | null,
  disparador: HTMLElement | null,
): void => {
  if (!dialogo || !disparador) return;

  disparador.addEventListener("click", () => {
    if (dialogo.open) return;
    dialogo.showModal();
    bloqueo.tomar();
  });

  // "close" cubre todas las formas de cerrar: el botón con method="dialog",
  // el Escape y el click en el fondo.
  dialogo.addEventListener("close", () => bloqueo.soltar());

  dialogo.addEventListener("click", (evento) => {
    if (clickEnElFondo(dialogo, evento)) dialogo.close();
  });
};
