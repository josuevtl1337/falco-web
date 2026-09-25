/**
 * Lo que dice el cartel después de guardar. La página que guarda redirige con
 * `?guardado=<clave>` (y `&que=<nombre>` si hace falta), y el layout lo
 * muestra: así recargar no vuelve a mandar el formulario.
 */
const AVISOS: Record<string, { titulo: string; detalle: string }> = {
  ajustes: {
    titulo: "Guardado. Ya se ve en el sitio.",
    detalle: "WhatsApp, carta e Instagram actualizados.",
  },
  horarios: {
    titulo: "Guardado. Ya se ve en el sitio.",
    detalle: "La semana nueva ya manda en “Abierto ahora”.",
  },
  feriado: {
    titulo: "Guardado. Ya se ve en el sitio.",
    detalle: "El día especial ya cuenta para “Abierto ahora”.",
  },
  "feriado-borrado": { titulo: "Borrado.", detalle: "Ese día vuelve a tener el horario de siempre." },
  tolva: { titulo: "Guardado. Ya se ve en el sitio.", detalle: "La home ya muestra {que} en tolva." },
  cafe: { titulo: "Guardado.", detalle: "{que} quedó guardado en la lista de tolva." },
  orden: { titulo: "Guardado. Ya se ve en el sitio.", detalle: "El estante ya sale en el orden nuevo." },
  "cafe-borrado": { titulo: "Borrado.", detalle: "{que} ya no está en la lista de tolva." },
};

export function avisoDe(url: URL): { titulo: string; detalle: string } | null {
  const clave = url.searchParams.get("guardado");
  const aviso = clave ? AVISOS[clave] : undefined;
  if (!aviso) return null;
  const que = url.searchParams.get("que") ?? "";
  return { titulo: aviso.titulo, detalle: aviso.detalle.replace("{que}", que) };
}

/** La dirección a la que redirigir después de guardar. */
export function conAviso(ruta: string, clave: string, que?: string): string {
  const params = new URLSearchParams({ guardado: clave });
  if (que) params.set("que", que);
  return `${ruta}?${params}`;
}
