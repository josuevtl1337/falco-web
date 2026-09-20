import type { DayHours, WeekHours } from "@falco/domain";
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
  const row = await firstRow<CoffeeRow>(
    db.prepare("SELECT * FROM coffees WHERE id = ?").bind(id),
  );
  return row ? toCoffee(row) : undefined;
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

export async function getWeekHours(db: ReadableDb): Promise<WeekHours> {
  const rows = await allRows<{
    weekday: number;
    is_closed: number;
    opens_at: string | null;
    closes_at: string | null;
  }>(db.prepare("SELECT * FROM business_hours ORDER BY weekday"));
  // WeekHours es Readonly<Record<number, DayHours>>: se arma un objeto mutable
  // y recién al devolverlo toma el tipo de solo lectura.
  const week: Record<number, DayHours> = {};
  for (const row of rows) {
    week[row.weekday] = {
      isClosed: row.is_closed === 1,
      opensAt: row.opens_at,
      closesAt: row.closes_at,
    };
  }
  return week;
}

// `limit` es el tope de filas que pide el SQL LIMIT, no una cantidad de días:
// con days = 400 puede haber un solo feriado, o ninguno.
export async function getUpcomingSpecialDays(
  db: ReadableDb,
  fromDate: string,
  limit: number,
): Promise<
  {
    date: string;
    isClosed: boolean;
    opensAt: string | null;
    closesAt: string | null;
    note?: string;
  }[]
> {
  const rows = await allRows<{
    date: string;
    is_closed: number;
    opens_at: string | null;
    closes_at: string | null;
    note: string | null;
  }>(
    db
      .prepare(
        "SELECT * FROM special_days WHERE date >= ? ORDER BY date LIMIT ?",
      )
      .bind(fromDate, limit),
  );
  return rows.map((row) => ({
    date: row.date,
    isClosed: row.is_closed === 1,
    opensAt: row.opens_at,
    closesAt: row.closes_at,
    note: row.note ?? undefined,
  }));
}
