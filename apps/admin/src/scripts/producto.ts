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
  const bloque = form.querySelector<HTMLElement>("[data-opciones-bloque]");
  const titulo = form.querySelector<HTMLElement>("[data-opciones-titulo]");
  const ayuda = form.querySelector<HTMLElement>("[data-opciones-ayuda]");
  const sumar = form.querySelector<HTMLElement>("[data-sumar-opcion]");
  tipo?.addEventListener("change", () => {
    const cafe = tipo.value === "coffee";
    const ropa = tipo.value === "apparel";
    if (origen) origen.hidden = !cafe;
    // Moliendas para un café, talles para ropa; accesorios y kits, nada.
    if (bloque) bloque.hidden = !cafe && !ropa;
    if (titulo) titulo.textContent = ropa ? "Talles" : "Moliendas";
    if (ayuda)
      ayuda.textContent = ropa
        ? "Los talles que hay. Si ninguno tiene stock, el sitio muestra “Sin stock por ahora”."
        : "Cómo se vende: “En grano”, “Molido”. Si ninguna tiene stock, el sitio muestra “Sin stock por ahora”.";
    if (sumar) sumar.textContent = ropa ? "+ talle" : "+ molienda";
    const nombres = [...form.querySelectorAll<HTMLInputElement>("input[name=opcion-label]")];
    for (const input of nombres) input.placeholder = ropa ? "Talle" : "Molienda";
    // Un café sin moliendas cargadas arranca con las dos de siempre.
    if (cafe && nombres.every((i) => i.value.trim() === "")) {
      const lista = form.querySelector<HTMLElement>("[data-opciones]");
      const primera = nombres[0];
      if (primera) primera.value = "En grano";
      if (lista && primera) {
        const fila = primera.closest<HTMLElement>("[data-opcion]")?.cloneNode(true) as HTMLElement | undefined;
        const input = fila?.querySelector<HTMLInputElement>("input[name=opcion-label]");
        if (fila && input) {
          input.value = "Molido";
          lista.insertBefore(fila, sumar);
        }
      }
    }
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
