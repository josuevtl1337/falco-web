export const AR_TIMEZONE = "America/Argentina/Buenos_Aires";

export type LocalMoment = { date: string; weekday: number; minutes: number };

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AR_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function toArgentina(instant: Date): LocalMoment {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant))
    parts[part.type] = part.value;
  const weekday = WEEKDAYS[parts.weekday ?? ""];
  if (weekday === undefined)
    throw new Error(`Unexpected weekday: ${parts.weekday}`);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const HHMM = /^(?:([01]\d|2[0-3]):([0-5]\d)|(24):(00))$/;

export function parseHHMM(value: string): number {
  const match = HHMM.exec(value);
  if (!match) throw new Error(`Invalid time: ${value}`);
  if (match[3] === "24") return 1440;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatHHMM(minutes: number): string {
  const inDay = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(inDay / 60);
  const mins = inDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const moment = new Date(`${date}T12:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}
