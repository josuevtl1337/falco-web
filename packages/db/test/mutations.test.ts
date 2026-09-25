import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import {
  createHopperCoffee,
  reorderShelf,
  deleteHopperCoffee,
  deleteSpecialDay,
  saveSettings,
  saveSpecialDay,
  saveWeekHours,
  setHopperCoffee,
  updateHopperCoffee,
} from "../src/mutations";
import {
  getHopperCoffee,
  getSettings,
  getWeekHours,
  listHopperCoffees,
  listShelfForAdmin,
} from "../src/queries";
import type { WritableDb } from "../src/queries";
import { seededDatabase, toWritableDb } from "./sqlite-db";

const QUIEN = "duenio@falco.cafe";

let real: Database.Database;
let db: WritableDb;

beforeEach(() => {
  real = seededDatabase();
  db = toWritableDb(real);
});

const valor = <T>(query: string, ...params: unknown[]): T =>
  real.prepare(query).get(...params) as T;

const semana = (
  cambios: Record<number, { opensAt: string; closesAt: string }[]> = {},
) =>
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    shifts: cambios[weekday] ?? [{ opensAt: "08:00", closesAt: "20:00" }],
  }));

const cafe = {
  name: "Tarrazú",
  country: "Costa Rica",
  process: "Honey",
  altitudeMasl: 1600,
  tastingNotes: "Mandarina, caramelo",
  acidity: 4,
  sweetness: 4,
  body: 3,
  aroma: 3,
  finish: 3,
};

describe("ajustes", () => {
  it("guarda el WhatsApp sólo con dígitos y deja quién lo cambió", async () => {
    const r = await saveSettings(
      db,
      {
        whatsappNumber: "+54 9 342 466-7646",
        menuUrl: "https://drive.google.com/nueva",
        instagramUrl: "https://www.instagram.com/falco.cafe/",
      },
      QUIEN,
    );
    expect(r.ok).toBe(true);
    const settings = await getSettings(db);
    expect(settings.whatsapp_number).toBe("5493424667646");
    expect(settings.menu_url).toBe("https://drive.google.com/nueva");
    expect(
      valor<{ updated_by: string }>(
        "SELECT updated_by FROM settings WHERE key = 'menu_url'",
      ).updated_by,
    ).toBe(QUIEN);
  });

  it("rechaza un link que no es https, y no guarda nada", async () => {
    const r = await saveSettings(
      db,
      {
        whatsappNumber: "5493424667646",
        menuUrl: "http://drive.google.com/nueva",
        instagramUrl: "https://www.instagram.com/falco.cafe/",
      },
      QUIEN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.menuUrl).toMatch(/https/);
    expect((await getSettings(db)).menu_url).not.toBe(
      "http://drive.google.com/nueva",
    );
  });
});

describe("la semana", () => {
  it("se guarda entera, con días partidos y días cerrados", async () => {
    const r = await saveWeekHours(
      db,
      semana({
        1: [
          { opensAt: "08:00", closesAt: "12:30" },
          { opensAt: "16:30", closesAt: "20:30" },
        ],
        0: [],
      }),
      QUIEN,
    );
    expect(r.ok).toBe(true);
    const week = await getWeekHours(db);
    expect(week[1]?.shifts).toHaveLength(2);
    expect(week[0]?.shifts).toHaveLength(0);
  });

  it("si un tramo cierra antes de abrir, no se guarda ningún día y dice cuál", async () => {
    const antes = await getWeekHours(db);
    const r = await saveWeekHours(
      db,
      semana({ 2: [{ opensAt: "16:30", closesAt: "14:00" }] }),
      QUIEN,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const [clave, mensaje] = Object.entries(r.errors)[0]!;
      expect(clave).toBe("2.shifts.0.closesAt");
      expect(mensaje).toMatch(/cierre/);
    }
    expect(await getWeekHours(db)).toEqual(antes);
  });
});

describe("los feriados", () => {
  it("se crean, se editan y se borran", async () => {
    const nuevo = await saveSpecialDay(
      db,
      { date: "2026-11-02", note: "Cerrado por inventario", shifts: [] },
      QUIEN,
    );
    expect(nuevo.ok).toBe(true);
    expect(
      valor<{ n: number }>(
        "SELECT count(*) AS n FROM special_days WHERE date = '2026-11-02'",
      ).n,
    ).toBe(1);

    const editado = await saveSpecialDay(
      db,
      {
        date: "2026-11-02",
        note: "Abrimos tarde",
        shifts: [{ opensAt: "16:00", closesAt: "20:00" }],
      },
      QUIEN,
    );
    expect(editado.ok).toBe(true);
    expect(
      valor<{ note: string }>(
        "SELECT note FROM special_days WHERE date = '2026-11-02'",
      ).note,
    ).toBe("Abrimos tarde");
    expect(
      valor<{ n: number }>(
        "SELECT count(*) AS n FROM special_day_shifts WHERE date = '2026-11-02'",
      ).n,
    ).toBe(1);

    await deleteSpecialDay(db, "2026-11-02");
    expect(
      valor<{ n: number }>(
        "SELECT count(*) AS n FROM special_days WHERE date = '2026-11-02'",
      ).n,
    ).toBe(0);
  });

  it("cambiarle la fecha a un feriado no deja el viejo", async () => {
    await saveSpecialDay(
      db,
      { date: "2026-11-02", note: "X", shifts: [] },
      QUIEN,
    );
    await saveSpecialDay(
      db,
      { date: "2026-11-03", note: "X", shifts: [] },
      QUIEN,
      "2026-11-02",
    );
    expect(
      valor<{ n: number }>(
        "SELECT count(*) AS n FROM special_days WHERE date IN ('2026-11-02', '2026-11-03')",
      ).n,
    ).toBe(1);
  });

  it("rechaza una fecha que no existe", async () => {
    const r = await saveSpecialDay(
      db,
      { date: "2026-02-30", note: null, shifts: [] },
      QUIEN,
    );
    expect(r.ok).toBe(false);
  });
});

describe("la tolva", () => {
  it("un café nuevo se crea y se puede poner en tolva", async () => {
    const r = await createHopperCoffee(db, cafe, QUIEN);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await setHopperCoffee(db, r.id, QUIEN)).toEqual({ ok: true });
    expect((await getHopperCoffee(db))?.name).toBe("Tarrazú");
  });

  it("se edita, y el perfil fuera de 1 a 5 se rechaza con su mensaje", async () => {
    const r = await updateHopperCoffee(
      db,
      2,
      { ...cafe, name: "Sidama Guji" },
      QUIEN,
    );
    expect(r.ok).toBe(true);
    const malo = await updateHopperCoffee(db, 2, { ...cafe, body: 7 }, QUIEN);
    expect(malo.ok).toBe(false);
    if (!malo.ok) expect(malo.errors.body).toMatch(/1 al 5/);
  });

  it("no se puede borrar el que está en tolva, y dice qué hacer", async () => {
    const r = await deleteHopperCoffee(db, 1);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Poné otro en tolva/);
    expect((await listHopperCoffees(db)).map((c) => c.id)).toContain(1);
  });

  it("cualquier otro se borra", async () => {
    expect(await deleteHopperCoffee(db, 3)).toEqual({ ok: true });
    expect((await listHopperCoffees(db)).map((c) => c.id)).not.toContain(3);
  });

  it("no se puede poner en tolva un café que no existe", async () => {
    const r = await setHopperCoffee(db, 999, QUIEN);
    expect(r.ok).toBe(false);
    expect((await getHopperCoffee(db))?.id).toBe(1);
  });

  it("editar o borrar uno que ya no existe lo dice", async () => {
    const r = await updateHopperCoffee(db, 999, cafe, QUIEN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/ya no existe/);
  });
});

describe("el orden de un estante", () => {
  it("queda en el orden que se pidió, con los ocultos incluidos", async () => {
    const antes = (await listShelfForAdmin(db, "kits")).map((p) => p.id);
    const nuevo = [...antes].reverse();
    expect(await reorderShelf(db, "kits", nuevo, QUIEN)).toEqual({ ok: true });
    expect((await listShelfForAdmin(db, "kits")).map((p) => p.id)).toEqual(nuevo);
  });

  it("si falta un producto o sobra uno de otro estante, no toca nada", async () => {
    const antes = (await listShelfForAdmin(db, "kits")).map((p) => p.id);
    const r = await reorderShelf(db, "kits", [...antes.slice(1), 1], QUIEN);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Recargá/);
    expect((await listShelfForAdmin(db, "kits")).map((p) => p.id)).toEqual(antes);
  });
});
