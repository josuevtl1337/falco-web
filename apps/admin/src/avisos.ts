/**
 * Lo que dice el cartel después de guardar. La página que guarda redirige con
 * `?guardado=<clave>` (y `&que=<nombre>` si hace falta), y el layout lo
 * muestra: así recargar no vuelve a mandar el formulario.
 */
type Aviso = { titulo: string; detalle: string; error?: boolean };

const AVISOS: Record<string, Aviso> = {
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
  producto: { titulo: "Guardado. Ya se ve en el sitio.", detalle: "{que} quedó actualizado en la tienda." },
  "producto-borrado": { titulo: "Borrado.", detalle: "{que} ya no está en la tienda." },
  foto: { titulo: "Guardado. Ya se ve en el sitio.", detalle: "La foto nueva ya está en la tienda." },
  "foto-quitada": { titulo: "Listo.", detalle: "El producto vuelve a mostrarse sin foto." },
  "foto-error": { titulo: "No se subió la foto.", detalle: "{que}", error: true },
  "cafe-borrado": { titulo: "Borrado.", detalle: "{que} ya no está en la lista de tolva." },
};

export function avisoDe(url: URL): Aviso | null {
  const clave = url.searchParams.get("guardado");
  const aviso = clave ? AVISOS[clave] : undefined;
  if (!aviso) return null;
  const que = url.searchParams.get("que") ?? "";
  return { ...aviso, detalle: aviso.detalle.replace("{que}", que) };
}

/** La dirección a la que redirigir después de guardar. */
export function conAviso(ruta: string, clave: string, que?: string): string {
  const params = new URLSearchParams({ guardado: clave });
  if (que) params.set("que", que);
  return `${ruta}?${params}`;
}
