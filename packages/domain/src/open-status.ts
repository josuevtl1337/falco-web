import { addDays, formatHHMM, parseHHMM, toArgentina } from "./time";

export type DayHours = {
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};
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
const CLOSED_DAY: DayHours = { isClosed: true, opensAt: null, closesAt: null };

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

function isOpenDay(
  day: DayHours,
): day is DayHours & { opensAt: string; closesAt: string } {
  return !day.isClosed && day.opensAt !== null && day.closesAt !== null;
}

export function getOpenStatus(
  instant: Date,
  week: WeekHours,
  specials: readonly SpecialDay[] = [],
): OpenStatus {
  const now = toArgentina(instant);
  const today = hoursFor(now.date, now.weekday, week, specials);

  if (isOpenDay(today)) {
    const opens = parseHHMM(today.opensAt);
    const closes = parseHHMM(today.closesAt);
    if (now.minutes >= opens && now.minutes < closes) {
      const closesAt = formatHHMM(closes);
      return {
        state: "open",
        closesAt,
        label: `Abierto ahora · cierra ${closesAt}`,
      };
    }
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
    const day = hoursFor(date, weekday, week, specials);
    if (isOpenDay(day)) {
      const opensAt = formatHHMM(parseHHMM(day.opensAt));
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
