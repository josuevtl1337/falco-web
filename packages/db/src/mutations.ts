import type { z } from "zod";
import { allRows, type WritableDb, type WritableStatement } from "./queries";
import { slugify } from "./slug";
import {
  coffeeInputSchema,
  productInputSchema,
  productOptionInputSchema,
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

/** Los cafés de tolva y los de la tienda tienen las mismas columnas. */
type CoffeeTable = "coffees" | "hopper_coffees";

const insertCoffee = (
  db: WritableDb,
  table: CoffeeTable,
  data: z.output<typeof coffeeInputSchema>,
  by: string,
  returning = false,
): WritableStatement =>
  db
    .prepare(
      `INSERT INTO ${table} (${COFFEE_COLUMNS.join(", ")}, updated_by)
       VALUES (${COFFEE_COLUMNS.map(() => "?").join(", ")}, ?)${returning ? " RETURNING id" : ""}`,
    )
    .bind(...coffeeValues(data), by);

const updateCoffee = (
  db: WritableDb,
  table: CoffeeTable,
  id: number,
  data: z.output<typeof coffeeInputSchema>,
  by: string,
): WritableStatement =>
  db
    .prepare(
      `UPDATE ${table} SET ${COFFEE_COLUMNS.map((c) => `${c} = ?`).join(", ")},
         updated_at = ${NOW}, updated_by = ? WHERE id = ?`,
    )
    .bind(...coffeeValues(data), by, id);

const GONE = "Ese café ya no existe. Puede que alguien lo haya borrado.";

export async function createHopperCoffee(
  db: WritableDb,
  input: CoffeeDraft,
  by: string,
): Promise<MutationResult<{ id: number }>> {
  const parsed = coffeeInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const row = await insertCoffee(db, "hopper_coffees", parsed.data, by, true).first<{
    id: number;
  }>();
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

  await updateCoffee(db, "hopper_coffees", id, parsed.data, by).run();
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
  const actuales = (
    await allRows<{ id: number }>(db.prepare("SELECT id FROM products WHERE shelf = ?").bind(shelf))
  ).map((r) => r.id);
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

export type ProductOptionDraft = {
  /** El id de una molienda que ya existe; sin id, es nueva. */
  id?: number;
  label: string;
  isAvailable: boolean;
};

export type ProductDraft = {
  product: {
    kind: "coffee" | "gear" | "kit" | "apparel";
    name: string;
    detail: string;
    description?: string | null;
    priceCashArs: number;
    priceCardArs: number;
    isNew: boolean;
    isVisible: boolean;
    askStock: boolean;
  };
  /** El origen y el perfil: obligatorio si el producto es un café. */
  coffee?: CoffeeDraft;
  options: ProductOptionDraft[];
};

/** El estante sale del tipo: un café nunca puede terminar entre los kits. */
const shelfFor = (kind: ProductDraft["product"]["kind"]) =>
  kind === "coffee" ? "coffee" : "kits";

const GONE_PRODUCT = "Ese producto ya no existe. Puede que alguien lo haya borrado.";

type ProductRowLite = {
  id: number;
  slug: string;
  shelf: string;
  coffee_id: number | null;
  sort_order: number;
};

async function nextSortOrder(db: WritableDb, shelf: string): Promise<number> {
  const row = await db
    .prepare("SELECT coalesce(max(sort_order), 0) AS n FROM products WHERE shelf = ?")
    .bind(shelf)
    .first<{ n: number }>();
  return (row?.n ?? 0) + 1;
}

/** "molinillo-manual", o "molinillo-manual-2" si ya hay uno. */
async function freeSlug(db: WritableDb, name: string): Promise<string> {
  const base = slugify(name) || "producto";
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await exists(db, "SELECT 1 FROM products WHERE slug = ?", slug))) return slug;
  }
}

function validateProduct(draft: ProductDraft):
  | { ok: true; product: z.output<typeof productInputSchema>; coffee?: z.output<typeof coffeeInputSchema>; options: z.output<typeof productOptionInputSchema>[] }
  | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const product = productInputSchema.safeParse({
    ...draft.product,
    // La dirección y el orden los decide el guardado, no el formulario.
    slug: "producto",
    shelf: shelfFor(draft.product.kind),
    sortOrder: 0,
  });
  if (!product.success) Object.assign(errors, fieldErrors(product.error));

  let coffee: z.output<typeof coffeeInputSchema> | undefined;
  if (draft.product.kind === "coffee") {
    const parsed = coffeeInputSchema.safeParse(draft.coffee ?? {});
    if (parsed.success) coffee = parsed.data;
    else
      for (const [key, message] of Object.entries(fieldErrors(parsed.error)))
        errors[`coffee.${key}`] ??= message;
  }

  const options: z.output<typeof productOptionInputSchema>[] = [];
  draft.options.forEach((option, index) => {
    const parsed = productOptionInputSchema.safeParse({ ...option, sortOrder: index + 1 });
    if (parsed.success) options.push(parsed.data);
    else
      for (const [key, message] of Object.entries(fieldErrors(parsed.error)))
        errors[`options.${index}.${key}`] ??= message;
  });
  const labels = options.map((o) => o.label.toLowerCase());
  if (new Set(labels).size !== labels.length)
    errors.options = "Hay dos moliendas con el mismo nombre.";

  if (Object.keys(errors).length > 0 || !product.success) return { ok: false, errors };
  return { ok: true, product: product.data, coffee, options };
}

/**
 * Crea (`id` undefined) o edita un producto, con su origen si es café y sus
 * moliendas. Todo va en un solo batch: o se guarda entero o no se guarda
 * nada. Al editar, la dirección (`slug`) no cambia aunque cambie el nombre:
 * es el link que alguien pudo haber compartido. Y las moliendas conservan su
 * id: el pedido guardado de un cliente apunta a ese id.
 */
export async function saveProduct(
  db: WritableDb,
  id: number | undefined,
  draft: ProductDraft,
  by: string,
): Promise<MutationResult<{ id: number }>> {
  const valid = validateProduct(draft);
  if (!valid.ok) return { ok: false, errors: valid.errors };
  const { product, coffee, options } = valid;

  const current = id
    ? await db
        .prepare("SELECT id, slug, shelf, coffee_id, sort_order FROM products WHERE id = ?")
        .bind(id)
        .first<ProductRowLite>()
    : undefined;
  if (id && !current) return fail(GONE_PRODUCT);

  const statements: WritableStatement[] = [];

  // 1. El origen. Si hay que crearlo, el producto lo toma con
  //    last_insert_rowid(), que en el batch es la sentencia de antes.
  let coffeeRef = "NULL";
  const coffeeValuesRef: unknown[] = [];
  if (coffee && current?.coffee_id) {
    statements.push(updateCoffee(db, "coffees", current.coffee_id, coffee, by));
    coffeeRef = "?";
    coffeeValuesRef.push(current.coffee_id);
  } else if (coffee) {
    statements.push(insertCoffee(db, "coffees", coffee, by));
    coffeeRef = "last_insert_rowid()";
  }

  const values = [
    product.kind,
    product.shelf,
    product.name,
    product.detail,
    product.description ?? null,
    product.priceCardArs,
    product.priceCashArs,
    product.isNew ? 1 : 0,
    product.isVisible ? 1 : 0,
    product.askStock ? 1 : 0,
  ];

  // 2. El producto. Las moliendas nuevas lo encuentran por su dirección.
  const slug = current?.slug ?? (await freeSlug(db, product.name));
  const productRef = "(SELECT id FROM products WHERE slug = ?)";
  if (!current) {
    statements.push(
      db
        .prepare(
          `INSERT INTO products (slug, kind, shelf, name, detail, description, price_card_ars,
             price_cash_ars, is_new, is_visible, ask_stock, coffee_id, sort_order, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ${coffeeRef}, ?, ?)`,
        )
        .bind(slug, ...values, ...coffeeValuesRef, await nextSortOrder(db, product.shelf), by),
    );
  } else {
    // Si cambió de estante, va al final del nuevo.
    const sortOrder =
      current.shelf === product.shelf ? current.sort_order : await nextSortOrder(db, product.shelf);
    statements.push(
      db
        .prepare(
          `UPDATE products SET kind = ?, shelf = ?, name = ?, detail = ?, description = ?,
             price_card_ars = ?, price_cash_ars = ?, is_new = ?, is_visible = ?, ask_stock = ?,
             coffee_id = ${coffeeRef}, sort_order = ?, updated_at = ${NOW}, updated_by = ?
           WHERE id = ?`,
        )
        .bind(...values, ...coffeeValuesRef, sortOrder, by, current.id),
    );
  }

  // 3. Las moliendas: se borran las que ya no están, se actualizan las que
  //    tienen id y se crean las nuevas. Antes de poner los nombres finales,
  //    las que se quedan pasan por un nombre provisorio único: si no,
  //    intercambiar "En grano" y "Molido" chocaba con UNIQUE(product_id, label).
  const existingIds = current
    ? (
        await allRows<{ id: number }>(
          db.prepare("SELECT id FROM product_options WHERE product_id = ?").bind(current.id),
        )
      ).map((r) => r.id)
    : [];
  const keptIds = draft.options
    .map((o) => o.id)
    .filter((x): x is number => x !== undefined && existingIds.includes(x));

  for (const optionId of existingIds.filter((x) => !keptIds.includes(x))) {
    statements.push(db.prepare("DELETE FROM product_options WHERE id = ?").bind(optionId));
  }
  for (const optionId of keptIds) {
    statements.push(
      db.prepare("UPDATE product_options SET label = '~' || id WHERE id = ?").bind(optionId),
    );
  }
  options.forEach((option, index) => {
    const optionId = draft.options[index]?.id;
    statements.push(
      optionId !== undefined && keptIds.includes(optionId)
        ? db
            .prepare(
              `UPDATE product_options SET label = ?, is_available = ?, sort_order = ?,
                 updated_at = ${NOW}, updated_by = ? WHERE id = ?`,
            )
            .bind(option.label, option.isAvailable ? 1 : 0, index + 1, by, optionId)
        : db
            .prepare(
              `INSERT INTO product_options (product_id, label, is_available, sort_order, updated_by)
               VALUES (${productRef}, ?, ?, ?, ?)`,
            )
            .bind(slug, option.label, option.isAvailable ? 1 : 0, index + 1, by),
    );
  });

  // 4. Dejó de ser café: su origen ya no sirve.
  if (current?.coffee_id && !coffee) {
    statements.push(
      db
        .prepare(
          "DELETE FROM coffees WHERE id = ? AND NOT EXISTS (SELECT 1 FROM products WHERE coffee_id = ?)",
        )
        .bind(current.coffee_id, current.coffee_id),
    );
  }

  try {
    await db.batch(statements);
  } catch (error) {
    // Dos productos nuevos con el mismo nombre al mismo tiempo: el segundo
    // choca con la dirección. Nada quedó guardado; se puede volver a probar.
    if (String(error).includes("UNIQUE") && !current)
      return fail("Justo se creó otro producto con ese nombre. Probá de nuevo.");
    return fail("No se pudo guardar el producto. No se cambió nada; probá de nuevo.");
  }

  const saved = await db
    .prepare("SELECT id FROM products WHERE slug = ?")
    .bind(slug)
    .first<{ id: number }>();
  if (!saved) return fail("No se pudo guardar el producto. Probá de nuevo.");
  return { ok: true, id: saved.id };
}

/** Borra un producto con sus moliendas y, si es un café, su origen. */
export async function deleteProduct(db: WritableDb, id: number): Promise<MutationResult> {
  const current = await db
    .prepare("SELECT id, slug, shelf, coffee_id, sort_order FROM products WHERE id = ?")
    .bind(id)
    .first<ProductRowLite>();
  if (!current) return fail(GONE_PRODUCT);
  const statements: WritableStatement[] = [
    db.prepare("DELETE FROM product_options WHERE product_id = ?").bind(id),
    db.prepare("DELETE FROM products WHERE id = ?").bind(id),
  ];
  if (current.coffee_id) {
    statements.push(
      db
        .prepare(
          "DELETE FROM coffees WHERE id = ? AND NOT EXISTS (SELECT 1 FROM products WHERE coffee_id = ?)",
        )
        .bind(current.coffee_id, current.coffee_id),
    );
  }
  await db.batch(statements);
  return { ok: true };
}

/**
 * La foto de un producto: guarda la clave nueva y devuelve la anterior, para
 * que quien la subió la borre del bucket. La base no toca R2.
 *
 * Sólo escribe si la foto sigue siendo la que leyó: si otra pestaña la
 * cambió en el medio, devolver esa "anterior" haría borrar una foto en uso.
 */
export async function setProductImage(
  db: WritableDb,
  id: number,
  key: string | null,
  by: string,
): Promise<MutationResult<{ previousKey: string | null }>> {
  const current = await db
    .prepare("SELECT image_key FROM products WHERE id = ?")
    .bind(id)
    .first<{ image_key: string | null }>();
  if (!current) return fail(GONE_PRODUCT);

  const result = (await db
    .prepare(
      `UPDATE products SET image_key = ?, updated_at = ${NOW}, updated_by = ?
       WHERE id = ? AND image_key IS ?`,
    )
    .bind(key, by, id, current.image_key)
    .run()) as { changes?: number; meta?: { changes?: number } } | undefined;
  // D1 cuenta las filas en meta.changes; better-sqlite3, en changes.
  const changes = result?.meta?.changes ?? result?.changes;
  if (changes === 0)
    return fail("La foto cambió mientras tanto. Recargá la página y probá de nuevo.");
  return { ok: true, previousKey: current.image_key };
}
