import { addDays, formatHHMM, parseHHMM, toArgentina } from "./time";

export type Shift = { opensAt: string; closesAt: string };
/** Un día sin tramos está cerrado. */
export type DayHours = { shifts: readonly Shift[] };
export type WeekHours = Readonly<Record<number, DayHours>>;
export type SpecialDay = DayHours & { date: string; note?: string | null };
export type OpenStatus =
  | { state: "open"; closesAt: string; label: string }
  | {
      state: "closed";
      nextOpen: { date: string; opensAt: string } | null;
      label: string;
    };

const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const LOOKAHEAD_DAYS = 14;
const CLOSED_DAY: DayHours = { shifts: [] };

function hoursFor(
  date: string,
  weekday: number,
  week: WeekHours,
  specials: readonly SpecialDay[],
): DayHours {
  return (
    specials.find((special) => special.date === date) ??
    week[weekday] ??
    CLOSED_DAY
  );
}

// Se ordena por minuto de apertura, no por texto: "HH:MM" ya compara bien
// como texto, pero pasar por parseHHMM deja explícito que se ordena en
// minutos y no se rompe si algún día llega "24:00" como apertura.
function sortedShifts(day: DayHours): Shift[] {
  return [...day.shifts].sort(
    (a, b) => parseHHMM(a.opensAt) - parseHHMM(b.opensAt),
  );
}

export function getOpenStatus(
  instant: Date,
  week: WeekHours,
  specials: readonly SpecialDay[] = [],
): OpenStatus {
  const now = toArgentina(instant);
  const todayShifts = sortedShifts(
    hoursFor(now.date, now.weekday, week, specials),
  );

  for (const shift of todayShifts) {
    const opens = parseHHMM(shift.opensAt);
    const closes = parseHHMM(shift.closesAt);
    if (now.minutes >= opens && now.minutes < closes) {
      const closesAt = formatHHMM(closes);
      return {
        state: "open",
        closesAt,
        label: `Abierto ahora · cierra ${closesAt}`,
      };
    }
  }

  for (const shift of todayShifts) {
    const opens = parseHHMM(shift.opensAt);
    if (now.minutes < opens) {
      const opensAt = formatHHMM(opens);
      return {
        state: "closed",
        nextOpen: { date: now.date, opensAt },
        label: `Cerrado · abre ${opensAt}`,
      };
    }
  }

  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
    const date = addDays(now.date, offset);
    const weekday = (now.weekday + offset) % 7;
    const [first] = sortedShifts(hoursFor(date, weekday, week, specials));
    if (first) {
      const opensAt = formatHHMM(parseHHMM(first.opensAt));
      const when = offset === 1 ? "mañana" : `el ${WEEKDAY_NAMES[weekday]}`;
      return {
        state: "closed",
        nextOpen: { date, opensAt },
        label: `Cerrado · abre ${when} ${opensAt}`,
      };
    }
  }

  return { state: "closed", nextOpen: null, label: "Cerrado" };
}
