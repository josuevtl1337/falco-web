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
 * El candado, atado a los diálogos.
 *
 * Cada diálogo lleva una marca de "yo tengo tomado el candado". Sin esa marca,
 * soltarlo dos veces -una desde el evento `close` y otra desde el código que
 * llamó a cerrar- descontaría de más y dejaría el scroll libre con otro
 * diálogo todavía abierto.
 *
 * Que sea idempotente no es un lujo: el evento `close` de <dialog> es lo
 * correcto por especificación, pero no se puede dar por sentado en todos
 * lados. Comprobado en el navegador del panel de previsualización, que no lo
 * dispara ni con `close()` ni con Escape. Así, el cierre funciona igual venga
 * del evento o de nuestra llamada, y nunca descuenta dos veces.
 */
export const crearCandadoDeDialogos = (raiz: HTMLElement) => {
  const bloqueo = crearBloqueoDeScroll(raiz);
  const MARCA = "falcoCandado";

  return {
    tomar(dialogo: HTMLDialogElement) {
      if (dialogo.dataset[MARCA]) return;
      dialogo.dataset[MARCA] = "1";
      bloqueo.tomar();
    },
    soltar(dialogo: HTMLDialogElement) {
      if (!dialogo.dataset[MARCA]) return;
      delete dialogo.dataset[MARCA];
      bloqueo.soltar();
    },
    get abiertos() {
      return bloqueo.abiertos;
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

const candado = crearCandadoDeDialogos(document.documentElement);

/** Abre un diálogo modal tomando el candado del scroll. */
export const abrirDialogo = (dialogo: HTMLDialogElement): void => {
  if (dialogo.open) return;
  dialogo.showModal();
  candado.tomar(dialogo);
};

/** Cierra y suelta el candado, sin depender de que llegue el evento. */
export const cerrarDialogo = (dialogo: HTMLDialogElement): void => {
  dialogo.close();
  candado.soltar(dialogo);
};

/**
 * Deja un diálogo listo: cierra al tocar el fondo y suelta el candado cuando
 * se cierra, venga el cierre de donde venga.
 *
 * Se separa de `conectarDialogo` porque no todos los diálogos los abre un
 * botón: el panel de detalle lo abre el enlace de la ficha, y aun así necesita
 * el mismo candado.
 */
export const prepararDialogo = (
  dialogo: HTMLDialogElement | null,
  /**
   * Lo que haya que hacer además de soltar el candado, sea cual sea el camino
   * por el que se cerró: el panel de detalle, por ejemplo, deshace su paso del
   * historial. Tiene que ser idempotente: puede llegarle más de un camino.
   */
  alCerrar?: () => void,
): void => {
  if (!dialogo) return;

  const cerrado = () => {
    candado.soltar(dialogo);
    alCerrar?.();
  };

  // Los tres caminos por los que un diálogo se cierra, cada uno enganchado:
  //   1. el navegador avisa (Escape, o close() donde el evento sí llega),
  //   2. el botón de cerrar, que es un <form method="dialog">,
  //   3. el click en el fondo, que cerramos nosotros.
  dialogo.addEventListener("close", cerrado);

  for (const form of dialogo.querySelectorAll("form[method='dialog']")) {
    form.addEventListener("submit", cerrado);
  }

  dialogo.addEventListener("click", (evento) => {
    if (!clickEnElFondo(dialogo, evento)) return;
    dialogo.close();
    cerrado();
  });
};

/** Conecta un botón con su diálogo modal. */
export const conectarDialogo = (
  dialogo: HTMLDialogElement | null,
  disparador: HTMLElement | null,
): void => {
  if (!dialogo || !disparador) return;

  prepararDialogo(dialogo);
  disparador.addEventListener("click", () => abrirDialogo(dialogo));
};
