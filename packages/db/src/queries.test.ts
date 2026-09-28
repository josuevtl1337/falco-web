import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import {
  countProducts,
  getProductForAdmin,
  getHopperCoffee,
  getProductBySlug,
  getSettings,
  getUpcomingSpecialDays,
  getWeekHours,
  listCoffeesByIds,
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

function freshDb(): Database.Database {
  const real = new Database(":memory:");
  real.exec(sql("../migrations/0001_init.sql"));
  real.exec(sql("../seed/seed.sql"));
  return real;
}

beforeAll(() => {
  db = toReadableDb(freshDb());
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

  // La tolva tiene su propio catálogo: sus cafés rotan y no tienen nada que
  // ver con los que se venden. Sidama sólo existe en hopper_coffees.
  it("lee de su propio catálogo, no de los cafés que se venden", async () => {
    const real = freshDb();
    real.exec("UPDATE settings SET value = '2' WHERE key = 'hopper_coffee_id'");
    const coffee = await getHopperCoffee(toReadableDb(real));
    expect(coffee?.name).toBe("Sidama");
    const enVenta = real
      .prepare("SELECT count(*) AS n FROM coffees WHERE name = 'Sidama'")
      .get() as { n: number };
    expect(enVenta.n).toBe(0);
  });

  it("si el café en tolva ya no existe, no hay tolva (y nada se rompe)", async () => {
    const real = freshDb();
    real.exec("UPDATE settings SET value = '999' WHERE key = 'hopper_coffee_id'");
    expect(await getHopperCoffee(toReadableDb(real))).toBeUndefined();
  });
});

describe("listCoffeesByIds", () => {
  it("trae los cafés pedidos, con su perfil", async () => {
    const [coffee] = await listCoffeesByIds(db, [1]);
    expect(coffee?.name).toBe("Huila");
    expect(coffee?.profile.acidity).toBeGreaterThanOrEqual(1);
  });

  // Un `IN ()` vacío es SQL inválido: sin ids la consulta ni se hace. Si
  // alguien saca ese atajo, esto explota en vez de devolver [].
  it("sin ids no consulta nada y devuelve vacío", async () => {
    expect(await listCoffeesByIds(db, [])).toEqual([]);
  });

  // El detalle pide un café por producto: si dos productos comparten café, la
  // lista trae ids repetidos y el IN tendría el mismo id dos veces.
  it("no repite un café aunque el id venga dos veces", async () => {
    const coffees = await listCoffeesByIds(db, [1, 1, 1]);
    expect(coffees).toHaveLength(1);
  });

  it("ignora los ids que no existen en vez de fallar", async () => {
    const coffees = await listCoffeesByIds(db, [1, 9999]);
    expect(coffees.map((coffee) => coffee.id)).toEqual([1]);
  });
});

describe("listShelf", () => {
  it("trae solo los productos visibles, en su orden, con las opciones", async () => {
    const products = await listShelf(db, "coffee");
    expect(products.every((p) => p.isVisible)).toBe(true);
    const coffee = products.find((p) => p.slug === "huila-colombia");
    expect(coffee?.options.map((o) => o.label)).toEqual(["En grano", "Molido"]);
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
    // El único is_visible = 0 del seed es el borrador de prueba: el catálogo
    // real se muestra entero, así que no hay ningún producto de verdad oculto.
    const hidden = await getProductBySlug(db, "producto-de-prueba");
    expect(hidden).toBeUndefined();
  });
});

describe("getWeekHours", () => {
  it("devuelve los siete días, indexados por día de la semana", async () => {
    const week = await getWeekHours(db);
    expect(Object.keys(week)).toHaveLength(7);
    expect(Array.isArray(week[1]?.shifts)).toBe(true);
  });

  it("trae los dos tramos de un día partido, ordenados por apertura", async () => {
    const week = await getWeekHours(db);
    // Lunes: mañana 08:00-12:30, tarde 16:30-20:30 (ver seed.sql).
    expect(week[1]?.shifts).toEqual([
      { opensAt: "08:00", closesAt: "12:30" },
      { opensAt: "16:30", closesAt: "20:30" },
    ]);
  });

  it("un día sin tramos llega con una lista vacía, no con undefined", async () => {
    const real = new Database(":memory:");
    real.exec(sql("../migrations/0001_init.sql"));
    real.exec(sql("../seed/seed.sql"));
    real.prepare("DELETE FROM business_hour_shifts WHERE weekday = 0").run();
    const emptyDb = toReadableDb(real);
    const week = await getWeekHours(emptyDb);
    expect(week[0]?.shifts).toEqual([]);
  });
});

describe("getUpcomingSpecialDays", () => {
  it("trae los días especiales desde una fecha, sin los viejos", async () => {
    const days = await getUpcomingSpecialDays(db, "2026-01-01", 400);
    expect(days.length).toBeGreaterThan(0);
    const old = await getUpcomingSpecialDays(db, "2030-01-01", 30);
    expect(old).toHaveLength(0);
  });

  it("trae los tramos de cada feriado, con la nota", async () => {
    const days = await getUpcomingSpecialDays(db, "2026-01-01", 400);
    const christmas = days.find((day) => day.date === "2026-12-25");
    expect(christmas?.note).toBe("Navidad");
    expect(christmas?.shifts).toEqual([
      { opensAt: "16:00", closesAt: "20:00" },
    ]);
  });
});

describe("countProducts", () => {
  it("cuenta los visibles y los ocultos por separado", async () => {
    const { visible, hidden } = await countProducts(db);
    expect(visible).toBeGreaterThan(0);
    // El seed tiene un único borrador oculto.
    expect(hidden).toBe(1);
  });
});

describe("getProductForAdmin", () => {
  it("trae también un producto oculto, con sus moliendas", async () => {
    const oculto = await getProductForAdmin(db, 8);
    expect(oculto?.isVisible).toBe(false);
    expect(await getProductForAdmin(db, 999)).toBeUndefined();
  });
});
