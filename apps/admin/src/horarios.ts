/**
 * Lo que comparten las pantallas de horarios: leer los tramos de un
 * formulario y los nombres de los días.
 */

export const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

/** La semana como la lee una persona: de lunes a domingo. */
export const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0] as const;

export type TramoForm = { opensAt: string; closesAt: string };

/**
 * Los tramos de un día, tal como vinieron del formulario.
 *
 * - Las filas vacías se ignoran: el formulario siempre trae una de más.
 * - Una fila a medias se manda igual, para que la validación diga qué falta.
 * - El selector de hora del celular no tiene "24:00": cerrar a las 00:00 es
 *   cerrar a la medianoche, y se guarda como 24:00.
 */
export function leerTramos(form: FormData, prefijo: string): TramoForm[] {
  const abre = form.getAll(`${prefijo}-abre`).map(String);
  const cierra = form.getAll(`${prefijo}-cierra`).map(String);
  const tramos: TramoForm[] = [];
  for (let i = 0; i < Math.max(abre.length, cierra.length); i++) {
    const opensAt = (abre[i] ?? "").trim();
    let closesAt = (cierra[i] ?? "").trim();
    if (!opensAt && !closesAt) continue;
    if (closesAt === "00:00") closesAt = "24:00";
    tramos.push({ opensAt, closesAt });
  }
  return tramos;
}

/** "24:00" vuelve a mostrarse como 00:00 en el selector de hora. */
export const aSelector = (hora: string): string => (hora === "24:00" ? "00:00" : hora);

/** "Lunes 12/10" a partir de "2026-10-12". */
export function nombreDeFecha(fecha: string): string {
  const [, mes, dia] = fecha.split("-");
  const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return `${DIAS[diaSemana]} ${Number(dia)}/${Number(mes)}`;
}

/** Los errores de un día o de un tramo: las claves empiezan con su prefijo. */
export function erroresDe(errores: Record<string, string>, prefijo: string): string[] {
  return Object.entries(errores)
    .filter(([clave]) => clave === prefijo || clave.startsWith(`${prefijo}.`))
    .map(([, mensaje]) => mensaje);
}
