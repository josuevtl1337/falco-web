import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const MIGRATION = read("../migrations/0001_init.sql");
const SEED = read("../seed/seed.sql");

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(MIGRATION);
  db.exec(SEED);
});

const count = (table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

const run = (sql: string) => () => db.prepare(sql).run();
const one = <T>(sql: string) => db.prepare(sql).get() as T;

// Inserta una fila válida en la que cada prueba cambia una sola columna.
// Los valores van como SQL literal para poder distinguir 1500 de 1500.0.
const insert =
  (table: string, base: Record<string, string>) =>
  (overrides: Record<string, string> = {}) => {
    const row = { ...base, ...overrides };
    const columns = Object.keys(row).join(", ");
    const values = Object.values(row).join(", ");
    return run(`INSERT INTO ${table} (${columns}) VALUES (${values})`);
  };

const coffee = insert("coffees", {
  name: "'Probeta'",
  country: "'Brasil'",
  acidity: "3",
  sweetness: "3",
  body: "3",
  aroma: "3",
  finish: "3",
});

const product = insert("products", {
  slug: "'probeta'",
  kind: "'gear'",
  shelf: "'kits'",
  name: "'Probeta'",
  detail: "'Una prueba'",
  price_ars: "100",
});

// Ninguna fecha del seed real (feriados fijos + Viernes Santo 2026-2027)
// cae en noviembre, así que la probeta usa una fecha libre.
const specialDay = insert("special_days", {
  date: "'2026-11-15'",
});

const specialDayShift = insert("special_day_shifts", {
  date: "'2026-11-15'",
  opens_at: "'16:00'",
  closes_at: "'20:00'",
});

const businessHourShift = insert("business_hour_shifts", {
  weekday: "2",
  opens_at: "'05:00'",
  closes_at: "'06:00'",
});

const option = insert("product_options", {
  product_id: "3",
  label: "'XXL'",
});

const setting = insert("settings", { key: "'probeta'", value: "'si'" });

describe("0001_init + seed", () => {
  it("carga los datos de prueba", () => {
    expect(count("coffees")).toBe(1);
    expect(count("products")).toBe(5);
    expect(count("product_options")).toBe(7);
    expect(count("business_hours")).toBe(7);
    // Lunes a sábado con 2 tramos (mediodía y tarde) + domingo con 1 tramo.
    expect(count("business_hour_shifts")).toBe(6 * 2 + 1);
    const hopper = db
      .prepare("SELECT value FROM settings WHERE key = 'hopper_coffee_id'")
      .get() as { value: string };
    expect(hopper.value).toBe("1");
  });

  it("carga los feriados fijos 2026-2027 y el Viernes Santo de cada año", () => {
    // 9 feriados fijos × 2 años + 2 Viernes Santo móviles.
    expect(count("special_days")).toBe(9 * 2 + 2);
    // Cada feriado tiene un solo tramo, el mismo horario que el domingo.
    expect(count("special_day_shifts")).toBe(9 * 2 + 2);
    const christmas = one<{ opens_at: string; closes_at: string }>(
      "SELECT opens_at, closes_at FROM special_day_shifts WHERE date = '2026-12-25'",
    );
    expect(christmas).toEqual({ opens_at: "16:00", closes_at: "20:00" });
  });

  it("trae un producto oculto, uno a consultar y un talle agotado", () => {
    expect(count("products WHERE is_visible = 0")).toBe(1);
    expect(count("products WHERE ask_stock = 1")).toBe(1);
    expect(count("product_options WHERE is_available = 0")).toBe(1);
  });

  it("rechaza valores del pentágono fuera de 1 a 5", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO coffees (name, country, acidity, sweetness, body, aroma, finish) VALUES ('X', 'Brasil', 6, 3, 3, 3, 3)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rechaza un tipo de producto desconocido", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (slug, kind, shelf, name, detail, price_ars) VALUES ('x', 'mate', 'kits', 'X', 'X', 100)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("solo un café puede tener coffee_id", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (slug, kind, shelf, coffee_id, name, detail, price_ars) VALUES ('x', 'gear', 'kits', 1, 'X', 'X', 100)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rechaza slugs repetidos", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (slug, kind, shelf, name, detail, price_ars) VALUES ('remera-falco', 'apparel', 'kits', 'X', 'X', 100)",
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it("al borrar un producto se borran sus opciones, y solo las suyas", () => {
    db.prepare("DELETE FROM products WHERE slug = 'remera-falco'").run();
    // Quedan las dos del café: en grano y molido.
    expect(count("product_options")).toBe(2);
  });

  it("no deja borrar un café que usa un producto", () => {
    expect(() => db.prepare("DELETE FROM coffees WHERE id = 1").run()).toThrow(
      /FOREIGN KEY/,
    );
  });

  it("un tramo con el cierre antes de la apertura se rechaza", () => {
    expect(
      businessHourShift({ opens_at: "'10:00'", closes_at: "'09:00'" }),
    ).toThrow(/CHECK/);
  });

  it("dos tramos con la misma hora de apertura el mismo día se rechazan", () => {
    // El seed ya tiene weekday = 1, opens_at = '08:00'.
    expect(
      businessHourShift({
        weekday: "1",
        opens_at: "'08:00'",
        closes_at: "'09:00'",
      }),
    ).toThrow(/UNIQUE|PRIMARY KEY/);
  });

  it("al borrar un día se borran sus tramos", () => {
    db.prepare("DELETE FROM business_hours WHERE weekday = 1").run();
    expect(count("business_hour_shifts WHERE weekday = 1")).toBe(0);
  });

  it("al borrar un día especial se borran sus tramos", () => {
    db.prepare("DELETE FROM special_days WHERE date = '2026-12-25'").run();
    expect(count("special_day_shifts WHERE date = '2026-12-25'")).toBe(0);
  });
});

describe("tipos estrictos", () => {
  it("todas las tablas son STRICT", () => {
    const tables = db
      .prepare("SELECT name, sql FROM sqlite_master WHERE type = 'table'")
      .all() as { name: string; sql: string }[];
    expect(tables).toHaveLength(8);
    for (const table of tables) expect(table.sql).toMatch(/\)\s*STRICT$/);
  });

  it("rechaza un precio escrito como texto", () => {
    expect(product({ price_ars: "'muchos'" })).toThrow(
      /cannot store TEXT value in INTEGER column/,
    );
  });

  it("rechaza un precio con centavos", () => {
    expect(product({ price_ars: "1600.5" })).toThrow(
      /cannot store REAL value in INTEGER column/,
    );
  });

  it("rechaza un valor del pentágono con decimales", () => {
    expect(coffee({ acidity: "3.5" })).toThrow(
      /cannot store REAL value in INTEGER column/,
    );
  });

  it("rechaza una altura con decimales", () => {
    expect(coffee({ altitude_masl: "1750.7" })).toThrow(
      /cannot store REAL value in INTEGER column/,
    );
  });

  it("guarda una altura escrita como 1500.0 como entero exacto", () => {
    expect(coffee({ altitude_masl: "1500.0" })).not.toThrow();
    expect(
      one<{ value: number; type: string }>(
        "SELECT altitude_masl AS value, typeof(altitude_masl) AS type FROM coffees WHERE name = 'Probeta'",
      ),
    ).toEqual({ value: 1500, type: "integer" });
  });

  it("guarda una bandera escrita como '1' como entero exacto", () => {
    expect(product({ is_new: "'1'" })).not.toThrow();
    expect(
      one<{ value: number; type: string }>(
        "SELECT is_new AS value, typeof(is_new) AS type FROM products WHERE slug = 'probeta'",
      ),
    ).toEqual({ value: 1, type: "integer" });
  });

  it("rechaza una bandera que no es un número", () => {
    expect(product({ is_new: "'si'" })).toThrow(
      /cannot store TEXT value in INTEGER column/,
    );
  });
});

describe("fechas de auditoría", () => {
  it("guarda las fechas en el mismo ISO-8601 UTC que el dominio", () => {
    coffee()();
    const row = one<{ created_at: string; updated_at: string }>(
      "SELECT created_at, updated_at FROM coffees WHERE name = 'Probeta'",
    );
    for (const value of [row.created_at, row.updated_at]) {
      expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
      expect(new Date(value).toISOString()).toBe(value.replace("Z", ".000Z"));
    }
  });

  it("todas las tablas editables guardan updated_at y updated_by", () => {
    const tables = [
      "coffees",
      "products",
      "product_options",
      "business_hours",
      "special_days",
      "settings",
    ];
    for (const table of tables) {
      const columns = (
        db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]
      ).map((column) => column.name);
      expect(columns).toContain("updated_at");
      expect(columns).toContain("updated_by");
    }
  });
});

describe("horas con formato HH:MM", () => {
  const badTimes = ["8:00", "24:30", "25:00", "08:60", "0800", "20:00:00", ""];

  it("rechaza una hora que el dominio no sabe leer", () => {
    for (const time of badTimes) {
      expect(
        run(
          `UPDATE business_hour_shifts SET opens_at = '${time}' WHERE weekday = 1 AND opens_at = '08:00'`,
        ),
      ).toThrow(/CHECK/);
      expect(
        run(
          `UPDATE business_hour_shifts SET closes_at = '${time}' WHERE weekday = 1 AND opens_at = '08:00'`,
        ),
      ).toThrow(/CHECK/);
    }
  });

  it("acepta 24:00 como cierre a la medianoche", () => {
    expect(
      run(
        "UPDATE business_hour_shifts SET closes_at = '24:00' WHERE weekday = 1 AND opens_at = '16:30'",
      ),
    ).not.toThrow();
  });

  it("acepta los bordes del reloj", () => {
    expect(
      businessHourShift({ opens_at: "'00:00'", closes_at: "'00:30'" }),
    ).not.toThrow();
    expect(
      businessHourShift({ opens_at: "'09:05'", closes_at: "'09:35'" }),
    ).not.toThrow();
    expect(
      businessHourShift({ opens_at: "'23:59'", closes_at: "'24:00'" }),
    ).not.toThrow();
  });

  it("un día especial exige el mismo formato de hora", () => {
    specialDay()();
    expect(specialDayShift({ opens_at: "'8:00'" })).toThrow(/CHECK/);
    expect(
      specialDayShift({ opens_at: "'08:00'", closes_at: "'24:00'" }),
    ).not.toThrow();
  });
});

describe("fechas de los días especiales", () => {
  it("rechaza algo que no es una fecha", () => {
    for (const date of ["not-a-date", "25/12/2026", "2026-2-5", "", "hoy"])
      expect(specialDay({ date: `'${date}'` })).toThrow(/CHECK/);
  });

  it("rechaza un día que no existe en el calendario", () => {
    for (const date of ["2026-02-30", "2026-13-01", "2026-12-32", "2026-02-29"])
      expect(specialDay({ date: `'${date}'` })).toThrow(/CHECK/);
  });

  it("acepta una fecha real, bisiesto incluido", () => {
    expect(specialDay({ date: "'2030-05-01'" })).not.toThrow();
    expect(specialDay({ date: "'2028-02-29'" })).not.toThrow();
  });
});

describe("textos obligatorios", () => {
  it("rechaza un slug que el sitio no podría rutear", () => {
    for (const slug of [
      "",
      "Remera",
      "remera falco",
      "remera_falco",
      "-remera",
      "remera-",
      "re--mera",
      "remerá",
    ])
      expect(product({ slug: `'${slug}'` })).toThrow(/CHECK/);
  });

  it("acepta un slug de minúsculas, números y guiones simples", () => {
    expect(product({ slug: "'remera-falco-2'" })).not.toThrow();
  });

  it("rechaza un texto obligatorio vacío o en blanco", () => {
    expect(coffee({ name: "''" })).toThrow(/CHECK/);
    expect(coffee({ name: "'   '" })).toThrow(/CHECK/);
    expect(coffee({ country: "''" })).toThrow(/CHECK/);
    expect(coffee({ roaster: "''" })).toThrow(/CHECK/);
    expect(product({ name: "''" })).toThrow(/CHECK/);
    expect(product({ detail: "'  '" })).toThrow(/CHECK/);
    expect(option({ label: "''" })).toThrow(/CHECK/);
    expect(setting({ key: "''" })).toThrow(/CHECK/);
    expect(setting({ value: "'   '" })).toThrow(/CHECK/);
  });
});
