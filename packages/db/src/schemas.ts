import { z } from "zod";

const TIME = /^(?:(?:[01]\d|2[0-3]):[0-5]\d|24:00)$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Usá ${max} caracteres como máximo.`)
    .optional()
    .transform((value) => (value ? value : undefined));

const requiredText = (max: number) =>
  z
    .string()
    .trim()
    .min(1, "Este campo es obligatorio.")
    .max(max, `Usá ${max} caracteres como máximo.`);

const profileValue = z
  .number({ invalid_type_error: "Tiene que ser un número del 1 al 5." })
  .int("Tiene que ser un número del 1 al 5.")
  .min(1, "Tiene que ser un número del 1 al 5.")
  .max(5, "Tiene que ser un número del 1 al 5.");

const httpsUrl = z
  .string()
  .trim()
  .url("Pegá un link completo.")
  .refine(
    (value) => value.startsWith("https://"),
    "Pegá un link que empiece con https://",
  );

export const timeSchema = z
  .string()
  .regex(TIME, "Usá el formato HH:MM, por ejemplo 08:30.");

const dayHoursShape = z.object({
  isClosed: z.boolean(),
  opensAt: timeSchema.nullable(),
  closesAt: timeSchema.nullable(),
});

type DayHoursShape = z.infer<typeof dayHoursShape>;

function checkDayHours(day: DayHoursShape, ctx: z.RefinementCtx): void {
  if (day.isClosed) return;
  if (!day.opensAt || !day.closesAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Completá la hora de apertura y la de cierre.",
      path: ["opensAt"],
    });
    return;
  }
  // "HH:MM" se compara bien como texto, y "24:00" queda después de cualquier otra hora.
  if (day.closesAt <= day.opensAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "La hora de cierre tiene que ser después de la de apertura.",
      path: ["closesAt"],
    });
  }
}

export const dayHoursSchema = dayHoursShape.superRefine(checkDayHours);

export const weekHoursSchema = z
  .array(
    dayHoursShape
      .extend({ weekday: z.number().int().min(0).max(6) })
      .superRefine(checkDayHours),
  )
  .length(7, "Completá los 7 días de la semana.")
  .refine(
    (days) => new Set(days.map((day) => day.weekday)).size === 7,
    "Cada día de la semana va una sola vez.",
  );

export const specialDaySchema = dayHoursShape
  .extend({
    date: z.string().regex(DATE, "Usá una fecha válida."),
    note: optionalText(60),
  })
  .superRefine(checkDayHours);

export const coffeeInputSchema = z.object({
  name: requiredText(60),
  farm: optionalText(80),
  country: requiredText(40),
  variety: optionalText(60),
  process: optionalText(60),
  altitudeMasl: z
    .number()
    .int("Poné la altura en metros, sin decimales.")
    .min(0)
    .max(3000, "La altura tiene que estar entre 0 y 3000 metros.")
    .optional(),
  tastingNotes: optionalText(120),
  description: optionalText(400),
  roaster: requiredText(60).default("Puerto Blest"),
  acidity: profileValue,
  sweetness: profileValue,
  body: profileValue,
  aroma: profileValue,
  finish: profileValue,
});

export const productInputSchema = z
  .object({
    slug: z.string().regex(SLUG, "Usá solo minúsculas, números y guiones."),
    kind: z.enum(["coffee", "gear", "kit", "apparel"]),
    shelf: z.enum(["coffee", "kits"]),
    coffeeId: z.number().int().positive().optional(),
    name: requiredText(60),
    detail: requiredText(80),
    description: optionalText(600),
    priceArs: z
      .number({ invalid_type_error: "Poné el precio en pesos, sin centavos." })
      .int("Poné el precio en pesos, sin centavos.")
      .min(0, "El precio no puede ser negativo."),
    isNew: z.boolean().default(false),
    isVisible: z.boolean().default(true),
    askStock: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
  })
  .refine(
    (product) => product.kind === "coffee" || product.coffeeId === undefined,
    {
      message:
        "Solo los productos de tipo café se vinculan a un café del catálogo.",
      path: ["coffeeId"],
    },
  );

export const productOptionInputSchema = z.object({
  label: requiredText(12),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export const settingsSchema = z.object({
  hopperCoffeeId: z.number().int().positive().nullable(),
  whatsappNumber: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .refine(
      (digits) => digits.length >= 10 && digits.length <= 15,
      "Poné el número completo, con 549 y la característica.",
    ),
  menuUrl: httpsUrl,
  instagramUrl: httpsUrl,
});

export type DayHoursInput = z.infer<typeof dayHoursSchema>;
export type SpecialDayInput = z.infer<typeof specialDaySchema>;
export type CoffeeInput = z.infer<typeof coffeeInputSchema>;
export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductOptionInput = z.infer<typeof productOptionInputSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
