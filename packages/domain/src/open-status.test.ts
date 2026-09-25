import { describe, expect, it } from "vitest";
import {
  getOpenStatus,
  type DayHours,
  type Shift,
  type SpecialDay,
  type WeekHours,
} from "./open-status";

const shift = (opensAt: string, closesAt: string): Shift => ({
  opensAt,
  closesAt,
});
const day = (...shifts: Shift[]): DayHours => ({ shifts });
const closed: DayHours = { shifts: [] };

// Lunes a sábado 08–20, domingo 15–20. Un solo tramo por día.
const WEEK: WeekHours = {
  0: day(shift("15:00", "20:00")),
  1: day(shift("08:00", "20:00")),
  2: day(shift("08:00", "20:00")),
  3: day(shift("08:00", "20:00")),
  4: day(shift("08:00", "20:00")),
  5: day(shift("08:00", "20:00")),
  6: day(shift("08:00", "20:00")),
};

// El horario real: se corta al mediodía y reabre a la tarde.
// Lunes a viernes 08–12:30 y 16:30–20:30, sábado 09–13 y 16:30–20:30, domingo 16–20.
const SPLIT_WEEK: WeekHours = {
  0: day(shift("16:00", "20:00")),
  1: day(shift("08:00", "12:30"), shift("16:30", "20:30")),
  2: day(shift("08:00", "12:30"), shift("16:30", "20:30")),
  3: day(shift("08:00", "12:30"), shift("16:30", "20:30")),
  4: day(shift("08:00", "12:30"), shift("16:30", "20:30")),
  5: day(shift("08:00", "12:30"), shift("16:30", "20:30")),
  6: day(shift("09:00", "13:00"), shift("16:30", "20:30")),
};

// El sábado 19/09/2026. Argentina = UTC-3.
const SAT_12_05 = new Date("2026-09-19T15:05:00Z");
const SAT_07_00 = new Date("2026-09-19T10:00:00Z");
const SAT_15_00 = new Date("2026-09-19T18:00:00Z");
const SAT_20_00 = new Date("2026-09-19T23:00:00Z");
const SAT_21_00 = new Date("2026-09-20T00:00:00Z");
const SAT_23_30 = new Date("2026-09-20T02:30:00Z");

// El domingo 20/09/2026.
const SUN_12_00 = new Date("2026-09-20T15:00:00Z");

// El martes 22/09/2026 y el miércoles 23/09/2026.
const TUE_08_00 = new Date("2026-09-22T11:00:00Z");
const TUE_10_00 = new Date("2026-09-22T13:00:00Z");
const TUE_12_30 = new Date("2026-09-22T15:30:00Z");
const TUE_14_00 = new Date("2026-09-22T17:00:00Z");
const TUE_16_30 = new Date("2026-09-22T19:30:00Z");
const TUE_21_00 = new Date("2026-09-23T00:00:00Z");

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
      { date: "2026-09-19", ...day(shift("10:00", "14:00")) },
    ];
    expect(getOpenStatus(SAT_12_05, WEEK, specials).label).toBe(
      "Abierto ahora · cierra 14:00",
    );
    expect(getOpenStatus(SAT_15_00, WEEK, specials).label).toBe(
      "Cerrado · abre mañana 15:00",
    );
  });

  it("un día especial sin tramos cierra el día aunque la semana diga que abre", () => {
    const specials: SpecialDay[] = [{ date: "2026-09-19", ...closed }];
    expect(getOpenStatus(SAT_12_05, WEEK, specials).state).toBe("closed");
  });

  it("acepta cierre a medianoche (24:00) y lo muestra como 00:00", () => {
    const lateWeek: WeekHours = { ...WEEK, 6: day(shift("18:00", "24:00")) };
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

  describe("horario partido al mediodía", () => {
    it("a las 14:00 de un martes dice que abre 16:30, no mañana", () => {
      expect(getOpenStatus(TUE_14_00, SPLIT_WEEK)).toEqual({
        state: "closed",
        nextOpen: { date: "2026-09-22", opensAt: "16:30" },
        label: "Cerrado · abre 16:30",
      });
    });

    it("a las 10:00 de un martes dice que cierra a las 12:30, el del tramo que corre", () => {
      expect(getOpenStatus(TUE_10_00, SPLIT_WEEK)).toEqual({
        state: "open",
        closesAt: "12:30",
        label: "Abierto ahora · cierra 12:30",
      });
    });

    it("a las 21:00 de un martes dice que abre mañana a las 08:00", () => {
      expect(getOpenStatus(TUE_21_00, SPLIT_WEEK)).toEqual({
        state: "closed",
        nextOpen: { date: "2026-09-23", opensAt: "08:00" },
        label: "Cerrado · abre mañana 08:00",
      });
    });

    it("un domingo a las 12:00 dice que abre hoy a las 16:00", () => {
      expect(getOpenStatus(SUN_12_00, SPLIT_WEEK)).toEqual({
        state: "closed",
        nextOpen: { date: "2026-09-20", opensAt: "16:00" },
        label: "Cerrado · abre 16:00",
      });
    });

    it("el minuto exacto de apertura de un tramo ya está abierto", () => {
      expect(getOpenStatus(TUE_08_00, SPLIT_WEEK).state).toBe("open");
      expect(getOpenStatus(TUE_16_30, SPLIT_WEEK).state).toBe("open");
    });

    it("el minuto exacto de cierre de un tramo ya está cerrado", () => {
      expect(getOpenStatus(TUE_12_30, SPLIT_WEEK)).toEqual({
        state: "closed",
        nextOpen: { date: "2026-09-22", opensAt: "16:30" },
        label: "Cerrado · abre 16:30",
      });
    });
  });
});
