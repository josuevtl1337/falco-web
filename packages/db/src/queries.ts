import type { DayHours, Shift, SpecialDay, WeekHours } from "@falco/domain";
import {
  toCoffee,
  toProduct,
  toProductOption,
  type Coffee,
  type CoffeeRow,
  type ProductOptionRow,
  type ProductRow,
  type ProductWithOptions,
} from "./rows";

// El mínimo que comparten D1 y better-sqlite3, para poder probar las consultas
// sin levantar un Worker. D1 devuelve promesas; better-sqlite3, valores sueltos.
export type PreparedLike = {
  bind(...values: unknown[]): PreparedLike;
  first<T>(): Promise<T | null> | T | undefined;
  all<T>(): Promise<{ results: T[] }> | T[];
};

export type ReadableDb = { prepare(sql: string): PreparedLike };

/**
 * Lo que necesita el admin para escribir: sentencias que además se ejecutan
 * (`run`) y un `batch` que corre varias como una sola transacción. D1 no
 * tiene BEGIN/COMMIT sueltos; `batch` es su forma de hacer "todo o nada".
 */
export type WritableStatement = {
  bind(...values: unknown[]): WritableStatement;
  first<T>(): Promise<T | null> | T | undefined;
  all<T>(): Promise<{ results: T[] }> | T[];
  run(): Promise<unknown> | unknown;
};

export type WritableDb = {
  prepare(sql: string): WritableStatement;
  batch(statements: WritableStatement[]): Promise<unknown> | unknown;
};

async function firstRow<T>(statement: PreparedLike): Promise<T | undefined> {
  const value = await statement.first<T>();
  return value ?? undefined;
}

async function allRows<T>(statement: PreparedLike): Promise<T[]> {
  const value = await statement.all<T>();
  return Array.isArray(value) ? value : value.results;
}

export type SettingsMap = Partial<Record<string, string>>;

export async function getSettings(db: ReadableDb): Promise<SettingsMap> {
  const rows = await allRows<{ key: string; value: string }>(
    db.prepare("SELECT key, value FROM settings"),
  );
  const settings: SettingsMap = {};
  for (const row of rows) settings[row.key] = row.value;
  return settings;
}

export async function getHopperCoffee(
  db: ReadableDb,
): Promise<Coffee | undefined> {
  const setting = await firstRow<{ value: string }>(
    db.prepare("SELECT value FROM settings WHERE key = 'hopper_coffee_id'"),
  );
  if (!setting) return undefined;
  const id = Number(setting.value);
  if (!Number.isInteger(id)) return undefined;
  // La tolva tiene su propio catálogo, con las mismas columnas que coffees:
  // por eso se lee con el mismo tipo y la home no distingue.
  const row = await firstRow<CoffeeRow>(
    db.prepare("SELECT * FROM hopper_coffees WHERE id = ?").bind(id),
  );
  return row ? toCoffee(row) : undefined;
}

/** Los cafés de tolva, para elegir cuál poner. */
export async function listHopperCoffees(db: ReadableDb): Promise<Coffee[]> {
  const rows = await allRows<CoffeeRow>(
    db.prepare("SELECT * FROM hopper_coffees ORDER BY name, id"),
  );
  return rows.map(toCoffee);
}

export async function getHopperCoffeeById(
  db: ReadableDb,
  id: number,
): Promise<Coffee | undefined> {
  const row = await firstRow<CoffeeRow>(
    db.prepare("SELECT * FROM hopper_coffees WHERE id = ?").bind(id),
  );
  return row ? toCoffee(row) : undefined;
}

/**
 * Los cafés de una lista de ids, en una sola consulta.
 *
 * El detalle de un producto de café muestra su perfil de cata, que vive en
 * `coffees` y no en `products`. Pedirlo producto por producto sería una
 * consulta por ficha; acá van todos juntos.
 */
export async function listCoffeesByIds(
  db: ReadableDb,
  ids: readonly number[],
): Promise<Coffee[]> {
  // Sin ids no hay nada que preguntar, y un `IN ()` vacío es SQL inválido.
  const unique = [...new Set(ids)];
  if (unique.length === 0) return [];

  const rows = await allRows<CoffeeRow>(
    db
      .prepare(
        "SELECT * FROM coffees WHERE id IN (" +
          unique.map(() => "?").join(", ") +
          ")",
      )
      .bind(...unique),
  );
  return rows.map(toCoffee);
}

async function withOptions(
  db: ReadableDb,
  rows: ProductRow[],
): Promise<ProductWithOptions[]> {
  if (rows.length === 0) return [];
  const options = await allRows<ProductOptionRow>(
    db
      .prepare(
        "SELECT * FROM product_options WHERE product_id IN (" +
          rows.map(() => "?").join(", ") +
          ") ORDER BY sort_order",
      )
      .bind(...rows.map((row) => row.id)),
  );
  return rows.map((row) => ({
    ...toProduct(row),
    options: options
      .filter((option) => option.product_id === row.id)
      .map(toProductOption),
  }));
}

export async function listShelf(
  db: ReadableDb,
  shelf: "coffee" | "kits",
): Promise<ProductWithOptions[]> {
  const rows = await allRows<ProductRow>(
    db
      .prepare(
        "SELECT * FROM products WHERE shelf = ? AND is_visible = 1 ORDER BY sort_order, id",
      )
      .bind(shelf),
  );
  return withOptions(db, rows);
}

export async function getProductBySlug(
  db: ReadableDb,
  slug: string,
): Promise<ProductWithOptions | undefined> {
  const row = await firstRow<ProductRow>(
    db
      .prepare("SELECT * FROM products WHERE slug = ? AND is_visible = 1")
      .bind(slug),
  );
  if (!row) return undefined;
  const [product] = await withOptions(db, [row]);
  return product;
}

// Trae los 7 días y sus tramos en una sola consulta, con un LEFT JOIN: así un
// día sin tramos (cerrado) sigue apareciendo, igual que withOptions trae las
// opciones de todos los productos de una vez en vez de una consulta por día.
export async function getWeekHours(db: ReadableDb): Promise<WeekHours> {
  const rows = await allRows<{
    weekday: number;
    opens_at: string | null;
    closes_at: string | null;
  }>(
    db.prepare(
      "SELECT bh.weekday AS weekday, bhs.opens_at AS opens_at, bhs.closes_at AS closes_at " +
        "FROM business_hours bh " +
        "LEFT JOIN business_hour_shifts bhs ON bhs.weekday = bh.weekday " +
        "ORDER BY bh.weekday, bhs.opens_at",
    ),
  );
  // WeekHours es Readonly<Record<number, DayHours>>: se arma un objeto mutable
  // y recién al devolverlo toma el tipo de solo lectura.
  const week: Record<number, DayHours> = {};
  for (const row of rows) {
    const day = (week[row.weekday] ??= { shifts: [] });
    if (row.opens_at !== null && row.closes_at !== null)
      (day.shifts as Shift[]).push({
        opensAt: row.opens_at,
        closesAt: row.closes_at,
      });
  }
  return week;
}

// `limit` es el tope de filas que pide el SQL LIMIT, no una cantidad de días:
// con days = 400 puede traer varios tramos de un solo feriado, o ninguno.
export async function getUpcomingSpecialDays(
  db: ReadableDb,
  fromDate: string,
  limit: number,
): Promise<SpecialDay[]> {
  const rows = await allRows<{
    date: string;
    note: string | null;
    opens_at: string | null;
    closes_at: string | null;
  }>(
    db
      .prepare(
        "SELECT sd.date AS date, sd.note AS note, sds.opens_at AS opens_at, sds.closes_at AS closes_at " +
          "FROM special_days sd " +
          "LEFT JOIN special_day_shifts sds ON sds.date = sd.date " +
          "WHERE sd.date >= ? ORDER BY sd.date, sds.opens_at LIMIT ?",
      )
      .bind(fromDate, limit),
  );
  const byDate = new Map<string, SpecialDay>();
  for (const row of rows) {
    let day = byDate.get(row.date);
    if (!day) {
      day = { date: row.date, note: row.note ?? undefined, shifts: [] };
      byDate.set(row.date, day);
    }
    if (row.opens_at !== null && row.closes_at !== null)
      (day.shifts as Shift[]).push({
        opensAt: row.opens_at,
        closesAt: row.closes_at,
      });
  }
  return [...byDate.values()];
}
