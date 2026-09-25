import { dayHoursSchema } from "@falco/db";

/**
 * Los tramos de cada día, sin recargar: sumar y quitar filas, abrir y cerrar
 * el día, y avisar ANTES de guardar si un tramo cierra antes de abrir. La
 * regla es la misma que usa el servidor (dayHoursSchema), importada, no
 * copiada. El servidor valida igual: esto es sólo para no esperar al guardado.
 */

const horas = (caja: HTMLElement) =>
  [...caja.querySelectorAll<HTMLElement>("[data-fila]")]
    .map((fila) => {
      const [abre, cierra] = fila.querySelectorAll<HTMLInputElement>("input");
      const closesAt = cierra?.value === "00:00" ? "24:00" : (cierra?.value ?? "");
      return { opensAt: abre?.value ?? "", closesAt, fila };
    })
    .filter((t) => t.opensAt || t.closesAt);

const revisar = (caja: HTMLElement) => {
  const abierto = caja.querySelector<HTMLInputElement>("[data-abierto]")?.checked ?? false;
  const salida = caja.querySelector<HTMLElement>("[data-errores]");
  for (const input of caja.querySelectorAll("input[type=time]")) input.removeAttribute("aria-invalid");
  if (!salida) return;

  const tramos = horas(caja);
  let mensajes: string[] = [];
  if (abierto && tramos.length === 0) {
    mensajes = ["Cargá al menos un horario, o marcá el día como cerrado."];
  } else if (abierto) {
    const r = dayHoursSchema.safeParse({ shifts: tramos.map(({ opensAt, closesAt }) => ({ opensAt, closesAt })) });
    if (!r.success) {
      mensajes = [...new Set(r.error.issues.map((i) => i.message))];
      for (const issue of r.error.issues) {
        const indice = issue.path[1];
        if (typeof indice === "number") {
          tramos[indice]?.fila
            .querySelectorAll("input[type=time]")
            .forEach((i) => i.setAttribute("aria-invalid", "true"));
        }
      }
    }
  }
  salida.textContent = mensajes.join(" ");
  salida.hidden = mensajes.length === 0;
};

const nuevaFila = (caja: HTMLElement): HTMLElement | null => {
  const modelo = caja.querySelector<HTMLElement>("[data-fila]");
  if (!modelo) return null;
  const fila = modelo.cloneNode(true) as HTMLElement;
  for (const input of fila.querySelectorAll("input")) input.value = "";
  // insertBefore y no before(): los tipos de Cloudflare pisan los del DOM
  // (ver docs/superpowers/notes/2026-09-24-estado.md).
  const sumar = caja.querySelector("[data-sumar]");
  sumar?.parentNode?.insertBefore(fila, sumar);
  return fila;
};

export const conectarTramos = (): void => {
  for (const caja of document.querySelectorAll<HTMLElement>("[data-tramos]")) {
    const filas = caja.querySelector<HTMLElement>("[data-filas]");
    const abierto = caja.querySelector<HTMLInputElement>("[data-abierto]");
    const texto = caja.querySelector<HTMLElement>("[data-abierto-texto]");

    abierto?.addEventListener("change", () => {
      if (filas) filas.hidden = !abierto.checked;
      if (texto) texto.textContent = abierto.checked ? "Abierto" : "Cerrado";
      revisar(caja);
    });

    caja.addEventListener("click", (evento) => {
      const destino = evento.target instanceof Element ? evento.target : null;
      if (destino?.closest("[data-sumar]")) {
        nuevaFila(caja)?.querySelector("input")?.focus();
      }
      const quitar = destino?.closest("[data-quitar]");
      if (quitar) {
        const fila = quitar.closest<HTMLElement>("[data-fila]");
        // La última fila no se borra: se vacía, así siempre hay dónde escribir.
        if (fila && caja.querySelectorAll("[data-fila]").length > 1) fila.remove();
        else fila?.querySelectorAll("input").forEach((i) => (i.value = ""));
        revisar(caja);
      }
    });

    caja.addEventListener("change", () => revisar(caja));
  }

  // "Copiar el lunes de martes a viernes".
  document.querySelector("[data-copiar-lunes]")?.addEventListener("click", () => {
    const lunes = document.querySelector<HTMLElement>('[data-tramos="d1"]');
    if (!lunes) return;
    const tramos = horas(lunes);
    const abierto = lunes.querySelector<HTMLInputElement>("[data-abierto]")?.checked ?? false;
    for (const dia of [2, 3, 4, 5]) {
      const caja = document.querySelector<HTMLElement>(`[data-tramos="d${dia}"]`);
      if (!caja) continue;
      const casilla = caja.querySelector<HTMLInputElement>("[data-abierto]");
      if (casilla) {
        casilla.checked = abierto;
        casilla.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const existentes = [...caja.querySelectorAll<HTMLElement>("[data-fila]")];
      existentes.slice(1).forEach((f) => f.remove());
      existentes[0]?.querySelectorAll("input").forEach((i) => (i.value = ""));
      tramos.forEach((t, i) => {
        const fila = i === 0 ? existentes[0] : nuevaFila(caja);
        const [abre, cierra] = fila?.querySelectorAll<HTMLInputElement>("input") ?? [];
        if (abre) abre.value = t.opensAt;
        if (cierra) cierra.value = t.closesAt === "24:00" ? "00:00" : t.closesAt;
      });
      nuevaFila(caja);
      revisar(caja);
    }
  });
};
