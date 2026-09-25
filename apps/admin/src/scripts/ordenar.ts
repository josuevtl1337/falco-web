/**
 * Reordenar un estante arrastrando el asa, con el dedo o con el mouse
 * (eventos de puntero, así anda igual en el celular). Al soltar, se manda el
 * orden nuevo. Las flechas subir/bajar siguen andando sin esto.
 */
export const conectarOrden = (): void => {
  for (const lista of document.querySelectorAll<HTMLElement>("[data-ordenable]")) {
    const estante = lista.dataset.ordenable;
    const form = document.querySelector<HTMLFormElement>(`[data-orden-form="${estante}"]`);

    lista.addEventListener("pointerdown", (evento) => {
      const asa = evento.target instanceof Element ? evento.target.closest<HTMLElement>("[data-asa]") : null;
      const item = asa?.closest<HTMLElement>("[data-id]");
      if (!asa || !item) return;
      evento.preventDefault();
      item.classList.add("arrastrando");
      const antes = [...lista.children].map((li) => (li as HTMLElement).dataset.id).join(",");

      const mover = (e: PointerEvent) => {
        // El item bajo el dedo, sin contar el que se arrastra.
        const otros = [...lista.querySelectorAll<HTMLElement>("[data-id]")].filter((li) => li !== item);
        const destino = otros.find((li) => {
          const r = li.getBoundingClientRect();
          return e.clientY >= r.top && e.clientY <= r.bottom;
        });
        if (!destino) return;
        const r = destino.getBoundingClientRect();
        const despues = e.clientY > r.top + r.height / 2;
        // insertBefore y no before()/after(): los tipos de Cloudflare pisan los del DOM.
        lista.insertBefore(item, despues ? destino.nextSibling : destino);
      };

      const soltar = () => {
        document.removeEventListener("pointermove", mover);
        document.removeEventListener("pointerup", soltar);
        document.removeEventListener("pointercancel", soltar);
        item.classList.remove("arrastrando");
        const ids = [...lista.children].map((li) => (li as HTMLElement).dataset.id).join(",");
        if (ids === antes || !form) return;
        const campo = form.querySelector<HTMLInputElement>('input[name="ids"]');
        if (campo) campo.value = ids;
        form.submit();
      };

      // En el documento y no en el asa con setPointerCapture: mover la fila
      // dentro de la lista la saca del DOM un instante, el navegador suelta la
      // captura y el "soltar" no llegaba nunca.
      document.addEventListener("pointermove", mover);
      document.addEventListener("pointerup", soltar);
      document.addEventListener("pointercancel", soltar);
    });
  }
};
