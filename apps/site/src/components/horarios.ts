import { addDays, type DayHours, type SpecialDay, type WeekHours } from "@falco/domain";

const DAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

/** La semana como la lee una persona: de lunes a domingo. */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export type HoursRow = {
  label: string;
  /** Un texto por tramo ("08:00 — 12:30"), o ["Cerrado"]. */
  shifts: string[];
  isToday: boolean;
};

export type SpecialRow = {
  label: string;
  shifts: string[];
  note: string | null;
  isToday: boolean;
};

/**
 * Un texto por tramo: ["08:00 — 12:30", "16:30 — 20:30"], o ["Cerrado"] si el
 * día no tiene tramos. Separados y no ya unidos con "y", para que en el
 * celular un horario partido baje de renglón entre tramos y no en el medio
 * de uno.
 */
export function formatShifts(day: DayHours | undefined): string[] {
  const shifts = day?.shifts ?? [];
  if (shifts.length === 0) return ["Cerrado"];
  return shifts.map((s) => `${s.opensAt} — ${s.closesAt}`);
}

function rangeLabel(days: number[]): string {
  const first = DAY_NAMES[days[0]!]!;
  if (days.length === 1) return first;
  const last = DAY_NAMES[days[days.length - 1]!]!.toLowerCase();
  return days.length === 2 ? `${first} y ${last}` : `${first} a ${last}`;
}

/**
 * Agrupa los días seguidos que tienen el mismo horario: "Lunes a viernes",
 * "Sábado", "Domingo". Así la tabla dice lo mismo que la semana cargada en el
 * admin, sin siete renglones casi iguales. Si el admin cambia un solo día, ese
 * día se separa solo.
 */
export function groupWeek(week: WeekHours, today: number): HoursRow[] {
  const groups: { days: number[]; shifts: string[] }[] = [];
  for (const weekday of WEEK_ORDER) {
    const shifts = formatShifts(week[weekday]);
    const last = groups[groups.length - 1];
    if (last && last.shifts.join() === shifts.join()) last.days.push(weekday);
    else groups.push({ days: [weekday], shifts });
  }
  return groups.map(({ days, shifts }) => ({
    label: rangeLabel(days),
    shifts,
    isToday: days.includes(today),
  }));
}

/**
 * Los días especiales (feriados) de la semana que viene, que cambian lo que
 * dice la tabla de arriba. Los más lejanos no se muestran: nadie planea un
 * café para dentro de un mes.
 */
export function upcomingSpecials(
  specials: readonly SpecialDay[],
  todayDate: string,
  days = 7,
): SpecialRow[] {
  const until = addDays(todayDate, days);
  return specials
    .filter((s) => s.date >= todayDate && s.date < until)
    .map((s) => {
      const [, month, day] = s.date.split("-");
      const weekday = new Date(`${s.date}T12:00:00Z`).getUTCDay();
      return {
        label: `${DAY_NAMES[weekday]} ${Number(day)}/${Number(month)}`,
        shifts: formatShifts(s),
        note: s.note ?? null,
        isToday: s.date === todayDate,
      };
    });
}

/**
 * El mensaje directo de Instagram. `ig.me/m/<cuenta>` abre el chat en la app;
 * si el link cargado no es de un perfil, se usa tal cual.
 */
export function instagramDmUrl(profileUrl: string | undefined): string | null {
  if (!profileUrl) return null;
  const match = /^https:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9._]+)\/?$/.exec(
    profileUrl,
  );
  return match ? `https://ig.me/m/${match[1]}` : profileUrl;
}
