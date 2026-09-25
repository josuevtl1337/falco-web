import type { WeekHours } from "@falco/domain";
import { describe, expect, it } from "vitest";
import {
  formatShifts,
  groupWeek,
  instagramDmUrl,
  upcomingSpecials,
} from "./horarios";

const corrido = (opensAt: string, closesAt: string) => ({
  shifts: [{ opensAt, closesAt }],
});
const partido = {
  shifts: [
    { opensAt: "08:00", closesAt: "12:30" },
    { opensAt: "16:30", closesAt: "20:30" },
  ],
};

// La semana del seed: lunes a viernes partido, sábado otro horario, domingo tarde.
const SEMANA: WeekHours = {
  0: corrido("16:00", "20:00"),
  1: partido,
  2: partido,
  3: partido,
  4: partido,
  5: partido,
  6: {
    shifts: [
      { opensAt: "09:00", closesAt: "13:00" },
      { opensAt: "16:30", closesAt: "20:30" },
    ],
  },
};

describe("los horarios de la semana", () => {
  it("agrupa los días seguidos con el mismo horario", () => {
    expect(groupWeek(SEMANA, 3).map((r) => r.label)).toEqual([
      "Lunes a viernes",
      "Sábado",
      "Domingo",
    ]);
  });

  it("junta los tramos de un día partido", () => {
    expect(groupWeek(SEMANA, 3)[0]!.shifts).toEqual([
      "08:00 — 12:30",
      "16:30 — 20:30",
    ]);
  });

  it("marca como hoy el grupo que contiene el día", () => {
    expect(groupWeek(SEMANA, 0).map((r) => r.isToday)).toEqual([
      false,
      false,
      true,
    ]);
    expect(groupWeek(SEMANA, 2)[0]!.isToday).toBe(true);
  });

  it("dos días seguidos se nombran con 'y', no con 'a'", () => {
    const week: WeekHours = { ...SEMANA, 6: corrido("16:00", "20:00") };
    expect(groupWeek(week, 1).map((r) => r.label)).toEqual([
      "Lunes a viernes",
      "Sábado y domingo",
    ]);
  });

  it("un día sin tramos dice Cerrado", () => {
    expect(formatShifts({ shifts: [] })).toEqual(["Cerrado"]);
    expect(formatShifts(undefined)).toEqual(["Cerrado"]);
  });
});

describe("los feriados que se vienen", () => {
  const feriados = [
    { date: "2026-10-12", note: "Diversidad Cultural", ...corrido("16:00", "20:00") },
    { date: "2026-11-23", note: "Soberanía Nacional", ...corrido("16:00", "20:00") },
  ];

  it("muestra sólo los de la próxima semana, con día y horario", () => {
    expect(upcomingSpecials(feriados, "2026-10-08")).toEqual([
      {
        label: "Lunes 12/10",
        shifts: ["16:00 — 20:00"],
        note: "Diversidad Cultural",
        isToday: false,
      },
    ]);
  });

  it("un feriado que es hoy se marca como hoy", () => {
    expect(upcomingSpecials(feriados, "2026-10-12")[0]!.isToday).toBe(true);
  });
});

describe("el mensaje directo de Instagram", () => {
  it("convierte el perfil en el link al chat", () => {
    expect(instagramDmUrl("https://www.instagram.com/falco.cafe/")).toBe(
      "https://ig.me/m/falco.cafe",
    );
  });

  it("sin perfil cargado, no hay botón", () => {
    expect(instagramDmUrl(undefined)).toBeNull();
  });
});
