import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getHopperCoffee,
  getProductBySlug,
  getSettings,
  getUpcomingSpecialDays,
  getWeekHours,
  listShelf,
  type PreparedLike,
  type ReadableDb,
} from "./queries";

const sql = (name: string) =>
  readFileSync(new URL(name, import.meta.url), "utf8");

// better-sqlite3 expone .get()/.all() sincrónicos, nunca .first(); ReadableDb
// existe justamente para que D1 (async, .first()/.all()) y better-sqlite3
// (sync, .get()/.all()) satisfagan la misma forma mínima. Este adaptador
// traduce uno al otro en vez de castear better-sqlite3 a un tipo que no tiene.
function toPreparedLike(
  statement: Database.Statement,
  boundValues: unknown[] = [],
): PreparedLike {
  return {
    bind(...values: unknown[]): PreparedLike {
      return toPreparedLike(statement, values);
    },
    first<T>(): T | undefined {
      return statement.get(...boundValues) as T | undefined;
    },
    all<T>(): T[] {
      return statement.all(...boundValues) as T[];
    },
  };
}

function toReadableDb(real: Database.Database): ReadableDb {
  return {
    prepare(sql: string): PreparedLike {
      return toPreparedLike(real.prepare(sql));
    },
  };
}

let db: ReadableDb;

beforeAll(() => {
  const real = new Database(":memory:");
  real.exec(sql("../migrations/0001_init.sql"));
  real.exec(sql("../seed/seed.sql"));
  db = toReadableDb(real);
});

describe("getSettings", () => {
  it("devuelve los ajustes como un objeto por clave", async () => {
    const settings = await getSettings(db);
    expect(settings.hopper_coffee_id).toBe("1");
    expect(settings.menu_url?.startsWith("https://")).toBe(true);
  });
});

describe("getHopperCoffee", () => {
  it("trae el café que apunta hopper_coffee_id", async () => {
    const coffee = await getHopperCoffee(db);
    expect(coffee?.name).toBe("Huila");
    expect(coffee?.profile.acidity).toBeGreaterThanOrEqual(1);
  });
});

describe("listShelf", () => {
  it("trae solo los productos visibles, en su orden, con las opciones", async () => {
    const products = await listShelf(db, "kits");
    expect(products.every((p) => p.isVisible)).toBe(true);
    const shirt = products.find((p) => p.slug === "remera-falco");
    expect(shirt?.options.map((o) => o.label)).toContain("Talle M");
  });

  it("nunca devuelve un producto oculto", async () => {
    const all = [
      ...(await listShelf(db, "coffee")),
      ...(await listShelf(db, "kits")),
    ];
    expect(all.some((p) => !p.isVisible)).toBe(false);
  });
});

describe("getProductBySlug", () => {
  it("el café trae sus opciones de molienda", async () => {
    const product = await getProductBySlug(db, "huila-colombia");
    expect(product?.options.map((o) => o.label)).toEqual([
      "En grano",
      "Molido",
    ]);
  });

  it("un slug que no existe devuelve undefined", async () => {
    expect(await getProductBySlug(db, "no-existe")).toBeUndefined();
  });

  it("un producto oculto no se sirve por su dirección", async () => {
    // El seed (packages/db/seed/seed.sql) marca is_visible = 0 en la prensa
    // francesa, no en un "kit-regalo-oculto": ese slug no existe en la base
    // real, así que la prueba usa el producto oculto que sí está.
    const hidden = await getProductBySlug(db, "prensa-francesa");
    expect(hidden).toBeUndefined();
  });
});

describe("getWeekHours", () => {
  it("devuelve los siete días, indexados por día de la semana", async () => {
    const week = await getWeekHours(db);
    expect(Object.keys(week)).toHaveLength(7);
    expect(
      week[1]?.isClosed === true || typeof week[1]?.opensAt === "string",
    ).toBe(true);
  });
});

describe("getUpcomingSpecialDays", () => {
  it("trae los días especiales desde una fecha, sin los viejos", async () => {
    const days = await getUpcomingSpecialDays(db, "2026-01-01", 400);
    expect(days.length).toBeGreaterThan(0);
    const old = await getUpcomingSpecialDays(db, "2030-01-01", 30);
    expect(old).toHaveLength(0);
  });
});
