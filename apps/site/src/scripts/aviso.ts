/**
 * El cartelito que confirma que algo se sumó al pedido.
 *
 * Entra desde la izquierda, se queda un rato y se va. Es `role="status"` y no
 * `alert`: avisa algo que salió bien, no interrumpe.
 */

import { poner } from "./dom";

const DURACION_MS = 3200;
let actual: HTMLElement | null = null;
let reloj: number | undefined;

export const mostrarAviso = (titulo: string, detalle: string): void => {
  // Sumar dos cosas seguidas reemplaza el cartel, no apila dos.
  actual?.remove();
  window.clearTimeout(reloj);

  const cartel = document.createElement("p");
  cartel.className = "aviso";
  cartel.setAttribute("role", "status");

  const fuerte = document.createElement("b");
  fuerte.textContent = titulo;
  const chico = document.createElement("span");
  chico.textContent = detalle;

  poner(cartel, fuerte, chico);
  poner(document.body, cartel);
  actual = cartel;

  reloj = window.setTimeout(() => {
    cartel.classList.add("aviso--yendose");
    // Se saca del DOM cuando termina de irse, no antes: si no, desaparece de
    // golpe en vez de salir.
    cartel.addEventListener("animationend", () => cartel.remove(), {
      once: true,
    });
    // Red de seguridad: con las animaciones apagadas no hay animationend.
    window.setTimeout(() => cartel.remove(), 600);
    if (actual === cartel) actual = null;
  }, DURACION_MS);
};
