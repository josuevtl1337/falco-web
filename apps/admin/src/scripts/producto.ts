import { leerPrecio } from "../producto";

/**
 * Lo que la ficha de producto hace sin recargar: mostrar el origen sólo si es
 * un café, sumar y quitar moliendas, y avisar si el precio con tarjeta quedó
 * por debajo del de efectivo (un aviso, no un error: puede ser a propósito).
 */
export const conectarFichaProducto = (): void => {
  const form = document.querySelector<HTMLFormElement>("[data-producto]");
  if (!form) return;

  // Tipado a mano: con los tipos de Cloudflare cargados, HTMLSelectElement no
  // cumple con Element (ver la nota de estado).
  const tipo = form.querySelector<HTMLElement & { value: string }>("[data-tipo]");
  const origen = form.querySelector<HTMLElement>("[data-origen]");
  tipo?.addEventListener("change", () => {
    if (origen) origen.hidden = tipo.value !== "coffee";
  });

  const efectivo = form.querySelector<HTMLInputElement>("input[name=priceCashArs]");
  const tarjeta = form.querySelector<HTMLInputElement>("input[name=priceCardArs]");
  const aviso = form.querySelector<HTMLElement>("[data-aviso-precio]");
  const revisarPrecio = () => {
    const a = leerPrecio(efectivo?.value ?? "");
    const b = leerPrecio(tarjeta?.value ?? "");
    if (aviso) aviso.hidden = !(Number.isFinite(a) && Number.isFinite(b) && b < a);
  };
  efectivo?.addEventListener("input", revisarPrecio);
  tarjeta?.addEventListener("input", revisarPrecio);
  revisarPrecio();

  const lista = form.querySelector<HTMLElement>("[data-opciones]");
  lista?.addEventListener("click", (evento) => {
    const destino = evento.target instanceof Element ? evento.target : null;
    if (destino?.closest("[data-sumar-opcion]")) {
      const modelo = lista.querySelector<HTMLElement>("[data-opcion]");
      if (!modelo) return;
      const fila = modelo.cloneNode(true) as HTMLElement;
      fila.querySelectorAll("input").forEach((i) => (i.value = ""));
      const stock = fila.querySelector("select");
      if (stock) stock.value = "1";
      // insertBefore: los tipos de Cloudflare pisan before() del DOM.
      const sumar = lista.querySelector("[data-sumar-opcion]");
      lista.insertBefore(fila, sumar);
      fila.querySelector<HTMLInputElement>("input[name=opcion-label]")?.focus();
    }
    const quitar = destino?.closest("[data-quitar-opcion]");
    if (quitar) {
      const fila = quitar.closest<HTMLElement>("[data-opcion]");
      if (fila && lista.querySelectorAll("[data-opcion]").length > 1) fila.remove();
      else fila?.querySelectorAll("input").forEach((i) => (i.value = ""));
    }
  });
};
