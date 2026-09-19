import { describe, expect, it } from "vitest";
import {
  getOpenStatus,
  type DayHours,
  type SpecialDay,
  type WeekHours,
} from "./open-status";

const open = (opensAt: string, closesAt: string): DayHours => ({
  isClosed: false,
  opensAt,
  closesAt,
});
const closed: DayHours = { isClosed: true, opensAt: null, closesAt: null };

// Lunes a sábado 08–20, domingo 15–20
const WEEK: WeekHours = {
  0: open("15:00", "20:00"),
  1: open("08:00", "20:00"),
  2: open("08:00", "20:00"),
  3: open("08:00", "20:00"),
  4: open("08:00", "20:00"),
  5: open("08:00", "20:00"),
  6: open("08:00", "20:00"),
};

// El sábado 19/09/2026. Argentina = UTC-3.
const SAT_12_05 = new Date("2026-09-19T15:05:00Z");
const SAT_07_00 = new Date("2026-09-19T10:00:00Z");
const SAT_15_00 = new Date("2026-09-19T18:00:00Z");
const SAT_20_00 = new Date("2026-09-19T23:00:00Z");
const SAT_21_00 = new Date("2026-09-20T00:00:00Z");
const SAT_23_30 = new Date("2026-09-20T02:30:00Z");

describe("getOpenStatus", () => {
  it("dice abierto y a qué hora cierra", () => {
    expect(getOpenStatus(SAT_12_05, WEEK)).toEqual({
      state: "open",
      closesAt: "20:00",
      label: "Abierto ahora · cierra 20:00",
    });
  });

  it("antes de abrir, dice a qué hora abre hoy", () => {
    expect(getOpenStatus(SAT_07_00, WEEK)).toEqual({
      state: "closed",
      nextOpen: { date: "2026-09-19", opensAt: "08:00" },
      label: "Cerrado · abre 08:00",
    });
  });

  it("a la hora exacta de cierre ya está cerrado", () => {
    expect(getOpenStatus(SAT_20_00, WEEK).state).toBe("closed");
  });

  it("después de cerrar, dice que abre mañana", () => {
    expect(getOpenStatus(SAT_21_00, WEEK)).toEqual({
      state: "closed",
      nextOpen: { date: "2026-09-20", opensAt: "15:00" },
      label: "Cerrado · abre mañana 15:00",
    });
  });

  it("si mañana es un día especial cerrado, busca el próximo día que abre", () => {
    const specials: SpecialDay[] = [
      { date: "2026-09-20", ...closed, note: "Feriado" },
    ];
    expect(getOpenStatus(SAT_21_00, WEEK, specials)).toEqual({
      state: "closed",
      nextOpen: { date: "2026-09-21", opensAt: "08:00" },
      label: "Cerrado · abre el lunes 08:00",
    });
  });

  it("un día especial de hoy tiene prioridad sobre el horario semanal", () => {
    const specials: SpecialDay[] = [
      { date: "2026-09-19", ...open("10:00", "14:00") },
    ];
    expect(getOpenStatus(SAT_12_05, WEEK, specials).label).toBe(
      "Abierto ahora · cierra 14:00",
    );
    expect(getOpenStatus(SAT_15_00, WEEK, specials).label).toBe(
      "Cerrado · abre mañana 15:00",
    );
  });

  it("acepta cierre a medianoche (24:00) y lo muestra como 00:00", () => {
    const lateWeek: WeekHours = { ...WEEK, 6: open("18:00", "24:00") };
    expect(getOpenStatus(SAT_23_30, lateWeek).label).toBe(
      "Abierto ahora · cierra 00:00",
    );
  });

  it("si no abre en las próximas dos semanas, dice solo 'Cerrado'", () => {
    const allClosed: WeekHours = {
      0: closed,
      1: closed,
      2: closed,
      3: closed,
      4: closed,
      5: closed,
      6: closed,
    };
    expect(getOpenStatus(SAT_12_05, allClosed)).toEqual({
      state: "closed",
      nextOpen: null,
      label: "Cerrado",
    });
  });
});
