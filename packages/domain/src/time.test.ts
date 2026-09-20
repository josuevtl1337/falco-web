import { describe, expect, it } from "vitest";
import { addDays, formatHHMM, parseHHMM, toArgentina } from "./time";

describe("toArgentina", () => {
  it("convierte un instante UTC a la hora de Argentina (UTC-3)", () => {
    // 02:30 UTC del sábado 19 = 23:30 del viernes 18 en Argentina
    expect(toArgentina(new Date("2026-09-19T02:30:00Z"))).toEqual({
      date: "2026-09-18",
      weekday: 5,
      minutes: 23 * 60 + 30,
    });
  });

  it("devuelve el día y los minutos del mediodía", () => {
    expect(toArgentina(new Date("2026-09-19T15:05:00Z"))).toEqual({
      date: "2026-09-19",
      weekday: 6,
      minutes: 12 * 60 + 5,
    });
  });
});

describe("parseHHMM", () => {
  it("convierte HH:MM a minutos", () => {
    expect(parseHHMM("08:00")).toBe(480);
    expect(parseHHMM("20:30")).toBe(1230);
  });

  it("acepta 24:00 como medianoche de cierre", () => {
    expect(parseHHMM("24:00")).toBe(1440);
  });

  it("rechaza formatos inválidos", () => {
    expect(() => parseHHMM("8:00")).toThrow();
    expect(() => parseHHMM("24:30")).toThrow();
    expect(() => parseHHMM("12:60")).toThrow();
  });
});

describe("formatHHMM", () => {
  it("formatea minutos como HH:MM", () => {
    expect(formatHHMM(480)).toBe("08:00");
    expect(formatHHMM(1230)).toBe("20:30");
  });

  it("muestra la medianoche como 00:00", () => {
    expect(formatHHMM(1440)).toBe("00:00");
  });
});

describe("addDays", () => {
  it("suma días cruzando el cambio de año", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-09-19", 2)).toBe("2026-09-21");
  });
});
