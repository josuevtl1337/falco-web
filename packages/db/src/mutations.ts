import type { z } from "zod";
import type { WritableDb, WritableStatement } from "./queries";
import {
  coffeeInputSchema,
  settingsSchema,
  specialDaySchema,
  weekHoursSchema,
} from "./schemas";

/**
 * Todo lo que el admin escribe en la base.
 *
 * Cada función valida con los esquemas de `schemas.ts` antes de tocar nada, y
 * devuelve un resultado en vez de tirar una excepción: el admin tiene que
 * poder mostrar el error al lado del campo, con el mensaje en castellano.
 * Lo que toca varias filas va en un `batch`, que en D1 es todo o nada.
 */

export type MutationResult<T = object> =
  | ({ ok: true } & T)
  | {
      ok: false;
      /** Un mensaje por campo, con la ruta separada por puntos. */
      errors: Record<string, string>;
      /** Cuando no es un campo mal escrito sino una regla del negocio. */
      reason?: string;
    };

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

/** El primer mensaje de zod de cada campo, con la ruta como clave. */
function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    errors[key] ??= issue.message;
  }
  return errors;
}

const fail = (reason: string): MutationResult<never> => ({
  ok: false,
  errors: {},
  reason,
});

async function exists(
  db: WritableDb,
  sql: string,
  ...values: unknown[]
): Promise<boolean> {
  const row = await db
    .prepare(sql)
    .bind(...values)
    .first<unknown>();
  return row !== null && row !== undefined;
}

/* ---------------------------------------------------------------- Ajustes */

const editableSettings = settingsSchema.omit({ hopperCoffeeId: true });
export type SettingsDraft = z.input<typeof editableSettings>;

const SETTING_KEYS = {
  whatsappNumber: "whatsapp_number",
  menuUrl: "menu_url",
  instagramUrl: "instagram_url",
} as const;

const upsertSetting = (
  db: WritableDb,
  key: string,
  value: string,
  by: string,
): WritableStatement =>
  db
    .prepare(
      `INSERT INTO settings (key, value, updated_at, updated_by) VALUES (?, ?, ${NOW}, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value,
         updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
    )
    .bind(key, value, by);

export async function saveSettings(
  db: WritableDb,
  input: SettingsDraft,
  by: string,
): Promise<MutationResult> {
  const parsed = editableSettings.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  await db.batch(
    (Object.keys(SETTING_KEYS) as (keyof typeof SETTING_KEYS)[]).map((field) =>
      upsertSetting(db, SETTING_KEYS[field], parsed.data[field], by),
    ),
  );
  return { ok: true };
}

/* --------------------------------------------------------------- Horarios */

export type WeekHoursDraft = z.input<typeof weekHoursSchema>;

/**
 * La semana entera, de una vez: se borran todos los tramos y se vuelven a
 * escribir, en la misma transacción. Si un solo día está mal, no se toca
 * ninguno. Las claves de error empiezan con el día (0 = domingo).
 */
export async function saveWeekHours(
  db: WritableDb,
  input: WeekHoursDraft,
  by: string,
): Promise<MutationResult> {
  const parsed = weekHoursSchema.safeParse(input);
  if (!parsed.success) {
    // zod indexa por posición en el arreglo; el admin piensa en días.
    const errors: Record<string, string> = {};
    for (const [key, message] of Object.entries(fieldErrors(parsed.error))) {
      const [index, ...rest] = key.split(".");
      const weekday = input[Number(index)]?.weekday;
      errors[weekday === undefined ? key : [weekday, ...rest].join(".")] ??=
        message;
    }
    return { ok: false, errors };
  }

  const statements: WritableStatement[] = [
    db.prepare("DELETE FROM business_hour_shifts"),
  ];
  for (const day of parsed.data) {
    statements.push(
      db
        .prepare(
          `INSERT INTO business_hours (weekday, updated_at, updated_by) VALUES (?, ${NOW}, ?)
           ON CONFLICT(weekday) DO UPDATE SET updated_at = excluded.updated_at,
             updated_by = excluded.updated_by`,
        )
        .bind(day.weekday, by),
    );
    for (const shift of day.shifts) {
      statements.push(
        db
          .prepare(
            "INSERT INTO business_hour_shifts (weekday, opens_at, closes_at) VALUES (?, ?, ?)",
          )
          .bind(day.weekday, shift.opensAt, shift.closesAt),
      );
    }
  }
  await db.batch(statements);
  return { ok: true };
}

export type SpecialDayDraft = z.input<typeof specialDaySchema>;

/**
 * Un día especial, nuevo o editado. `previousDate` es la fecha que tenía, si
 * se la cambiaron: el viejo se borra en la misma transacción.
 */
export async function saveSpecialDay(
  db: WritableDb,
  input: SpecialDayDraft,
  by: string,
  previousDate?: string,
): Promise<MutationResult> {
  const parsed = specialDaySchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  // La expresión regular deja pasar un 30 de febrero; SQLite no.
  const real = await db
    .prepare("SELECT strftime('%Y-%m-%d', ?) AS date")
    .bind(parsed.data.date)
    .first<{ date: string | null }>();
  if (real?.date !== parsed.data.date)
    return { ok: false, errors: { date: "Usá una fecha que exista." } };

  const { date, note, shifts } = parsed.data;
  const statements: WritableStatement[] = [];
  if (previousDate && previousDate !== date) {
    statements.push(
      db.prepare("DELETE FROM special_days WHERE date = ?").bind(previousDate),
    );
  }
  statements.push(
    db
      .prepare(
        `INSERT INTO special_days (date, note, updated_at, updated_by) VALUES (?, ?, ${NOW}, ?)
         ON CONFLICT(date) DO UPDATE SET note = excluded.note,
           updated_at = excluded.updated_at, updated_by = excluded.updated_by`,
      )
      .bind(date, note ?? null, by),
    db.prepare("DELETE FROM special_day_shifts WHERE date = ?").bind(date),
    ...shifts.map((shift) =>
      db
        .prepare(
          "INSERT INTO special_day_shifts (date, opens_at, closes_at) VALUES (?, ?, ?)",
        )
        .bind(date, shift.opensAt, shift.closesAt),
    ),
  );
  await db.batch(statements);
  return { ok: true };
}

export async function deleteSpecialDay(
  db: WritableDb,
  date: string,
): Promise<MutationResult> {
  await db.prepare("DELETE FROM special_days WHERE date = ?").bind(date).run();
  return { ok: true };
}

/* ------------------------------------------------------------------ Tolva */

export type CoffeeDraft = z.input<typeof coffeeInputSchema>;

const COFFEE_COLUMNS = [
  "name",
  "farm",
  "country",
  "variety",
  "process",
  "altitude_masl",
  "tasting_notes",
  "description",
  "roaster",
  "acidity",
  "sweetness",
  "body",
  "aroma",
  "finish",
] as const;

function coffeeValues(data: z.output<typeof coffeeInputSchema>): unknown[] {
  return [
    data.name,
    data.farm ?? null,
    data.country,
    data.variety ?? null,
    data.process ?? null,
    data.altitudeMasl ?? null,
    data.tastingNotes ?? null,
    data.description ?? null,
    data.roaster,
    data.acidity,
    data.sweetness,
    data.body,
    data.aroma,
    data.finish,
  ];
}

const GONE = "Ese café ya no existe. Puede que alguien lo haya borrado.";

export async function createHopperCoffee(
  db: WritableDb,
  input: CoffeeDraft,
  by: string,
): Promise<MutationResult<{ id: number }>> {
  const parsed = coffeeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const row = await db
    .prepare(
      `INSERT INTO hopper_coffees (${COFFEE_COLUMNS.join(", ")}, updated_by)
       VALUES (${COFFEE_COLUMNS.map(() => "?").join(", ")}, ?) RETURNING id`,
    )
    .bind(...coffeeValues(parsed.data), by)
    .first<{ id: number }>();
  if (!row) return fail("No se pudo guardar el café. Probá de nuevo.");
  return { ok: true, id: row.id };
}

export async function updateHopperCoffee(
  db: WritableDb,
  id: number,
  input: CoffeeDraft,
  by: string,
): Promise<MutationResult> {
  const parsed = coffeeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!(await exists(db, "SELECT 1 FROM hopper_coffees WHERE id = ?", id)))
    return fail(GONE);

  await db
    .prepare(
      `UPDATE hopper_coffees SET ${COFFEE_COLUMNS.map((c) => `${c} = ?`).join(", ")},
         updated_at = ${NOW}, updated_by = ? WHERE id = ?`,
    )
    .bind(...coffeeValues(parsed.data), by, id)
    .run();
  return { ok: true };
}

const hopperId = async (db: WritableDb): Promise<number | undefined> => {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = 'hopper_coffee_id'")
    .first<{ value: string }>();
  return row ? Number(row.value) : undefined;
};

/** Se borra cualquiera menos el que está en tolva: primero hay que poner otro. */
export async function deleteHopperCoffee(
  db: WritableDb,
  id: number,
): Promise<MutationResult> {
  if ((await hopperId(db)) === id)
    return fail(
      "Es el café que está en tolva ahora. Poné otro en tolva y después vas a poder borrarlo.",
    );
  await db.prepare("DELETE FROM hopper_coffees WHERE id = ?").bind(id).run();
  return { ok: true };
}

export async function setHopperCoffee(
  db: WritableDb,
  id: number,
  by: string,
): Promise<MutationResult> {
  if (!(await exists(db, "SELECT 1 FROM hopper_coffees WHERE id = ?", id)))
    return fail(GONE);
  await upsertSetting(db, "hopper_coffee_id", String(id), by).run();
  return { ok: true };
}

/* -------------------------------------------------------------- Productos */

/**
 * El orden de un estante, tal como quedó en la pantalla. Tiene que traer
 * exactamente los productos de ese estante: si alguien sumó o borró uno
 * mientras tanto, no se adivina dónde va, se pide recargar.
 */
export async function reorderShelf(
  db: WritableDb,
  shelf: "coffee" | "kits",
  ids: number[],
  by: string,
): Promise<MutationResult> {
  const rows = await db
    .prepare("SELECT id FROM products WHERE shelf = ?")
    .bind(shelf)
    .all<{ id: number }>();
  const actuales = (Array.isArray(rows) ? rows : rows.results).map((r) => r.id);
  const mismos =
    ids.length === actuales.length &&
    new Set(ids).size === ids.length &&
    ids.every((id) => actuales.includes(id));
  if (!mismos)
    return fail(
      "La lista cambió mientras la ordenabas. Recargá la página y probá de nuevo.",
    );

  await db.batch(
    ids.map((id, index) =>
      db
        .prepare(
          `UPDATE products SET sort_order = ?, updated_at = ${NOW}, updated_by = ? WHERE id = ?`,
        )
        .bind(index + 1, by, id),
    ),
  );
  return { ok: true };
}
