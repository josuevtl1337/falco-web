export const WEEKDAY_LABELS = [
  "DOM",
  "LUN",
  "MAR",
  "MIÉ",
  "JUE",
  "VIE",
  "SÁB",
] as const;

export type DayMoment = "MAÑANA" | "MEDIODÍA" | "TARDE" | "NOCHE";

/**
 * El momento del día para acompañar el chip de la fecha, a partir de los
 * minutos desde medianoche en hora de Argentina (toArgentina().minutes). No
 * hay una convención oficial para los cortes: se eligieron para que el
 * mediodía sea angosto (12:00–14:00) y el resto se reparta alrededor.
 */
export function dayMoment(minutes: number): DayMoment {
  if (minutes < 6 * 60) return "NOCHE";
  if (minutes < 12 * 60) return "MAÑANA";
  if (minutes < 14 * 60) return "MEDIODÍA";
  if (minutes < 20 * 60) return "TARDE";
  return "NOCHE";
}
