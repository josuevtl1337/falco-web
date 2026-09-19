# Plan 1 · Fundaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar armado el monorepo de `falco-web` con la base de datos (esquema, datos de prueba y validaciones), los tokens de diseño y toda la lógica del negocio probada: "Abierto ahora", el pedido con sus límites y vencimiento, su guardado en el navegador y el mensaje de WhatsApp.

**Architecture:** Monorepo con npm workspaces. Tres paquetes sin UI: `@falco/domain` (lógica pura en TypeScript, sin dependencias), `@falco/db` (migraciones SQL de D1, datos de prueba y esquemas zod) y `@falco/ui` (tokens de diseño en TS y CSS). Las apps (`apps/site`, `apps/admin`) llegan en los planes 2 y 3 y consumen estos paquetes.

**Tech Stack:** Node ≥ 20, npm workspaces, TypeScript (strict), Vitest, zod 3, better-sqlite3 (solo para probar las migraciones; en producción la base es Cloudflare D1, que también es SQLite).

**Spec:** `docs/superpowers/specs/2026-09-18-falco-web-design.md` · Alcance: `SCOPE.md`

## Global Constraints

- Textos que ve el usuario en español; código, nombres de archivos, tablas, columnas y rutas en inglés.
- Todas las horas se interpretan en `America/Argentina/Buenos_Aires`, nunca en la hora del dispositivo.
- Precios en pesos enteros (`price_ars INTEGER`).
- Pedido: máximo **20 productos distintos** y **2 unidades por producto**.
- Vencimiento del pedido: sin enviar, **3 días** desde el último cambio; enviado, **48 horas** desde el envío.
- Clave de guardado del pedido: `falco.order.v1`. Código de pedido: `F-XXXX`.
- Mensaje de WhatsApp: empieza con `¡Buenas!`, dice "Total estimado" y termina con `¿Me confirman si hay stock y desde qué hora lo puedo retirar?`. Nunca "comprado", "listo" ni "pedido hecho".
- Paleta: carbón `#292A2C`, piedra `#313335`, sombra `#1E1F21`, tostado `#885333`, hueso `#E8E2D0`, ceniza `#9A9C9E`, brasa `#F2C48B`. Sin rojo.
- Ángulos fijos: placas -14°, botones -12°, menú -8°, cajas de diálogo -6°, ticker -1,6°.
- Commits: conventional commits, **sin ninguna línea de atribución de IA**.
- No hay integración con `falco-app`.

---

## Estructura de archivos

```
falco-web/
  package.json                 # workspaces y scripts raíz
  tsconfig.base.json           # configuración TS compartida
  .editorconfig
  packages/
    domain/                    # @falco/domain — lógica pura
      package.json
      tsconfig.json
      src/
        index.ts               # reexporta todo
        time.ts                # hora de Argentina y utilidades de horas
        time.test.ts
        open-status.ts         # "Abierto ahora"
        open-status.test.ts
        order-code.ts          # código F-XXXX
        order-code.test.ts
        order.ts               # modelo del pedido: sumar, quitar, límites, vencimiento
        order.test.ts
        order-storage.ts       # guardar y leer el pedido del navegador
        order-storage.test.ts
        message.ts             # mensaje y link de WhatsApp
        message.test.ts
    db/                        # @falco/db — base de datos
      package.json
      tsconfig.json
      migrations/
        0001_init.sql
      seed/
        seed.sql
      src/
        index.ts
        schemas.ts             # validaciones zod compartidas por sitio y admin
        schemas.test.ts
        slug.ts
        slug.test.ts
      test/
        migrations.test.ts     # aplica migración + seed en SQLite en memoria
    ui/                        # @falco/ui — tokens de diseño
      package.json
      tsconfig.json
      src/
        tokens.ts
        tokens.css
        tokens.test.ts
```

Cada archivo de `domain` tiene una sola responsabilidad y ninguno importa nada de fuera del paquete, salvo `order-storage.ts` y `message.ts`, que importan tipos de `order.ts`.

---

### Task 1: Monorepo y hora de Argentina

**Files:**

- Create: `package.json`, `tsconfig.base.json`, `.editorconfig`
- Create: `packages/domain/package.json`, `packages/domain/tsconfig.json`
- Create: `packages/domain/src/time.ts`, `packages/domain/src/index.ts`
- Test: `packages/domain/src/time.test.ts`

**Interfaces:**

- Produces:
  - `AR_TIMEZONE: "America/Argentina/Buenos_Aires"`
  - `type LocalMoment = { date: string; weekday: number; minutes: number }` (date `YYYY-MM-DD`, weekday 0 = domingo, minutes desde las 00:00)
  - `toArgentina(instant: Date): LocalMoment`
  - `parseHHMM(value: string): number` (acepta `00:00`–`23:59` y `24:00`; tira error si no)
  - `formatHHMM(minutes: number): string` (1440 se muestra como `00:00`)
  - `addDays(date: string, days: number): string`

- [ ] **Step 1: Crear el monorepo**

`package.json`:

```json
{
  "name": "falco-web",
  "private": true,
  "type": "module",
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "engines": { "node": ">=20" }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "noEmit": true
  }
}
```

`.editorconfig`:

```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`packages/domain/package.json`:

```json
{
  "name": "@falco/domain",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  }
}
```

`packages/domain/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src"]
}
```

Instalar las herramientas en la raíz:

```bash
npm install --save-dev typescript vitest
```

- [ ] **Step 2: Escribir la prueba que falla**

`packages/domain/src/time.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addDays, formatHHMM, parseHHMM, toArgentina } from "./time";

describe("toArgentina", () => {
  it("convierte un instante UTC a la hora de Argentina (UTC-3)", () => {
    // 02:30 UTC del sábado 19 = 23:30 del viernes 18 en Argentina
    expect(toArgentina(new Date("2026-09-19T02:30:00Z"))).toEqual({
      date: "2026-09-18",
      weekday: 5,
      minutes: 23 * 60 + 30,
    });
  });

  it("devuelve el día y los minutos del mediodía", () => {
    expect(toArgentina(new Date("2026-09-19T15:05:00Z"))).toEqual({
      date: "2026-09-19",
      weekday: 6,
      minutes: 12 * 60 + 5,
    });
  });
});

describe("parseHHMM", () => {
  it("convierte HH:MM a minutos", () => {
    expect(parseHHMM("08:00")).toBe(480);
    expect(parseHHMM("20:30")).toBe(1230);
  });

  it("acepta 24:00 como medianoche de cierre", () => {
    expect(parseHHMM("24:00")).toBe(1440);
  });

  it("rechaza formatos inválidos", () => {
    expect(() => parseHHMM("8:00")).toThrow();
    expect(() => parseHHMM("24:30")).toThrow();
    expect(() => parseHHMM("12:60")).toThrow();
  });
});

describe("formatHHMM", () => {
  it("formatea minutos como HH:MM", () => {
    expect(formatHHMM(480)).toBe("08:00");
    expect(formatHHMM(1230)).toBe("20:30");
  });

  it("muestra la medianoche como 00:00", () => {
    expect(formatHHMM(1440)).toBe("00:00");
  });
});

describe("addDays", () => {
  it("suma días cruzando el cambio de año", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-09-19", 2)).toBe("2026-09-21");
  });
});
```

- [ ] **Step 3: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/domain`
Expected: FAIL — `Failed to resolve import "./time"`.

- [ ] **Step 4: Implementar**

`packages/domain/src/time.ts`:

```ts
export const AR_TIMEZONE = "America/Argentina/Buenos_Aires";

export type LocalMoment = { date: string; weekday: number; minutes: number };

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: AR_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  weekday: "short",
});

const WEEKDAYS: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function toArgentina(instant: Date): LocalMoment {
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(instant))
    parts[part.type] = part.value;
  const weekday = WEEKDAYS[parts.weekday ?? ""];
  if (weekday === undefined)
    throw new Error(`Unexpected weekday: ${parts.weekday}`);
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const HHMM = /^(?:([01]\d|2[0-3]):([0-5]\d)|(24):(00))$/;

export function parseHHMM(value: string): number {
  const match = HHMM.exec(value);
  if (!match) throw new Error(`Invalid time: ${value}`);
  if (match[3] === "24") return 1440;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function formatHHMM(minutes: number): string {
  const inDay = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(inDay / 60);
  const mins = inDay % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function addDays(date: string, days: number): string {
  const moment = new Date(`${date}T12:00:00Z`);
  moment.setUTCDate(moment.getUTCDate() + days);
  return moment.toISOString().slice(0, 10);
}
```

`packages/domain/src/index.ts`:

```ts
export * from "./time";
```

- [ ] **Step 5: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/domain && npm run typecheck`
Expected: PASS, sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json .editorconfig packages/domain
git commit -m "feat(domain): scaffold monorepo and argentina time helpers"
```

---

### Task 2: "Abierto ahora"

**Files:**

- Create: `packages/domain/src/open-status.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/open-status.test.ts`

**Interfaces:**

- Consumes: `toArgentina`, `parseHHMM`, `formatHHMM`, `addDays` (Task 1)
- Produces:
  - `type DayHours = { isClosed: boolean; opensAt: string | null; closesAt: string | null }`
  - `type WeekHours = Readonly<Record<number, DayHours>>` (claves 0–6, 0 = domingo)
  - `type SpecialDay = DayHours & { date: string; note?: string | null }`
  - `type OpenStatus = { state: "open"; closesAt: string; label: string } | { state: "closed"; nextOpen: { date: string; opensAt: string } | null; label: string }`
  - `getOpenStatus(instant: Date, week: WeekHours, specials?: readonly SpecialDay[]): OpenStatus`

- [ ] **Step 1: Escribir la prueba que falla**

`packages/domain/src/open-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  getOpenStatus,
  type DayHours,
  type SpecialDay,
  type WeekHours,
} from "./open-status";

const open = (opensAt: string, closesAt: string): DayHours => ({
  isClosed: false,
  opensAt,
  closesAt,
});
const closed: DayHours = { isClosed: true, opensAt: null, closesAt: null };

// Lunes a sábado 08–20, domingo 15–20
const WEEK: WeekHours = {
  0: open("15:00", "20:00"),
  1: open("08:00", "20:00"),
  2: open("08:00", "20:00"),
  3: open("08:00", "20:00"),
  4: open("08:00", "20:00"),
  5: open("08:00", "20:00"),
  6: open("08:00", "20:00"),
};

// El sábado 19/09/2026. Argentina = UTC-3.
const SAT_12_05 = new Date("2026-09-19T15:05:00Z");
const SAT_07_00 = new Date("2026-09-19T10:00:00Z");
const SAT_15_00 = new Date("2026-09-19T18:00:00Z");
const SAT_20_00 = new Date("2026-09-19T23:00:00Z");
const SAT_21_00 = new Date("2026-09-20T00:00:00Z");
const SAT_23_30 = new Date("2026-09-20T02:30:00Z");

describe("getOpenStatus", () => {
  it("dice abierto y a qué hora cierra", () => {
    expect(getOpenStatus(SAT_12_05, WEEK)).toEqual({
      state: "open",
      closesAt: "20:00",
      label: "Abierto ahora · cierra 20:00",
    });
  });

  it("antes de abrir, dice a qué hora abre hoy", () => {
    expect(getOpenStatus(SAT_07_00, WEEK)).toEqual({
      state: "closed",
      nextOpen: { date: "2026-09-19", opensAt: "08:00" },
      label: "Cerrado · abre 08:00",
    });
  });

  it("a la hora exacta de cierre ya está cerrado", () => {
    expect(getOpenStatus(SAT_20_00, WEEK).state).toBe("closed");
  });

  it("después de cerrar, dice que abre mañana", () => {
    expect(getOpenStatus(SAT_21_00, WEEK)).toEqual({
      state: "closed",
      nextOpen: { date: "2026-09-20", opensAt: "15:00" },
      label: "Cerrado · abre mañana 15:00",
    });
  });

  it("si mañana es un día especial cerrado, busca el próximo día que abre", () => {
    const specials: SpecialDay[] = [
      { date: "2026-09-20", ...closed, note: "Feriado" },
    ];
    expect(getOpenStatus(SAT_21_00, WEEK, specials)).toEqual({
      state: "closed",
      nextOpen: { date: "2026-09-21", opensAt: "08:00" },
      label: "Cerrado · abre el lunes 08:00",
    });
  });

  it("un día especial de hoy tiene prioridad sobre el horario semanal", () => {
    const specials: SpecialDay[] = [
      { date: "2026-09-19", ...open("10:00", "14:00") },
    ];
    expect(getOpenStatus(SAT_12_05, WEEK, specials).label).toBe(
      "Abierto ahora · cierra 14:00",
    );
    expect(getOpenStatus(SAT_15_00, WEEK, specials).label).toBe(
      "Cerrado · abre mañana 15:00",
    );
  });

  it("acepta cierre a medianoche (24:00) y lo muestra como 00:00", () => {
    const lateWeek: WeekHours = { ...WEEK, 6: open("18:00", "24:00") };
    expect(getOpenStatus(SAT_23_30, lateWeek).label).toBe(
      "Abierto ahora · cierra 00:00",
    );
  });

  it("si no abre en las próximas dos semanas, dice solo 'Cerrado'", () => {
    const allClosed: WeekHours = {
      0: closed,
      1: closed,
      2: closed,
      3: closed,
      4: closed,
      5: closed,
      6: closed,
    };
    expect(getOpenStatus(SAT_12_05, allClosed)).toEqual({
      state: "closed",
      nextOpen: null,
      label: "Cerrado",
    });
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/domain`
Expected: FAIL — `Failed to resolve import "./open-status"`.

- [ ] **Step 3: Implementar**

`packages/domain/src/open-status.ts`:

```ts
import { addDays, formatHHMM, parseHHMM, toArgentina } from "./time";

export type DayHours = {
  isClosed: boolean;
  opensAt: string | null;
  closesAt: string | null;
};
export type WeekHours = Readonly<Record<number, DayHours>>;
export type SpecialDay = DayHours & { date: string; note?: string | null };
export type OpenStatus =
  | { state: "open"; closesAt: string; label: string }
  | {
      state: "closed";
      nextOpen: { date: string; opensAt: string } | null;
      label: string;
    };

const WEEKDAY_NAMES = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const LOOKAHEAD_DAYS = 14;
const CLOSED_DAY: DayHours = { isClosed: true, opensAt: null, closesAt: null };

function hoursFor(
  date: string,
  weekday: number,
  week: WeekHours,
  specials: readonly SpecialDay[],
): DayHours {
  return (
    specials.find((special) => special.date === date) ??
    week[weekday] ??
    CLOSED_DAY
  );
}

function isOpenDay(
  day: DayHours,
): day is DayHours & { opensAt: string; closesAt: string } {
  return !day.isClosed && day.opensAt !== null && day.closesAt !== null;
}

export function getOpenStatus(
  instant: Date,
  week: WeekHours,
  specials: readonly SpecialDay[] = [],
): OpenStatus {
  const now = toArgentina(instant);
  const today = hoursFor(now.date, now.weekday, week, specials);

  if (isOpenDay(today)) {
    const opens = parseHHMM(today.opensAt);
    const closes = parseHHMM(today.closesAt);
    if (now.minutes >= opens && now.minutes < closes) {
      const closesAt = formatHHMM(closes);
      return {
        state: "open",
        closesAt,
        label: `Abierto ahora · cierra ${closesAt}`,
      };
    }
    if (now.minutes < opens) {
      const opensAt = formatHHMM(opens);
      return {
        state: "closed",
        nextOpen: { date: now.date, opensAt },
        label: `Cerrado · abre ${opensAt}`,
      };
    }
  }

  for (let offset = 1; offset <= LOOKAHEAD_DAYS; offset++) {
    const date = addDays(now.date, offset);
    const weekday = (now.weekday + offset) % 7;
    const day = hoursFor(date, weekday, week, specials);
    if (isOpenDay(day)) {
      const opensAt = formatHHMM(parseHHMM(day.opensAt));
      const when = offset === 1 ? "mañana" : `el ${WEEKDAY_NAMES[weekday]}`;
      return {
        state: "closed",
        nextOpen: { date, opensAt },
        label: `Cerrado · abre ${when} ${opensAt}`,
      };
    }
  }

  return { state: "closed", nextOpen: null, label: "Cerrado" };
}
```

Agregar a `packages/domain/src/index.ts`:

```ts
export * from "./open-status";
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/domain && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/open-status.ts packages/domain/src/open-status.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): compute open status in argentina time"
```

---

### Task 3: Código de pedido

**Files:**

- Create: `packages/domain/src/order-code.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/order-code.test.ts`

**Interfaces:**

- Produces:
  - `ORDER_CODE_PATTERN: RegExp` (`/^F-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/`)
  - `generateOrderCode(random?: () => number): string`

Se sacan del alfabeto los caracteres que se confunden al dictarlos o leerlos en el celular: `0/O`, `1/I/L`.

- [ ] **Step 1: Escribir la prueba que falla**

`packages/domain/src/order-code.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateOrderCode, ORDER_CODE_PATTERN } from "./order-code";

describe("generateOrderCode", () => {
  it("usa el primer carácter del alfabeto cuando el azar da 0", () => {
    expect(generateOrderCode(() => 0)).toBe("F-2222");
  });

  it("usa el último carácter cuando el azar da casi 1", () => {
    expect(generateOrderCode(() => 0.9999)).toBe("F-ZZZZ");
  });

  it("siempre genera códigos con el formato F-XXXX sin caracteres confusos", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOrderCode();
      expect(code).toMatch(ORDER_CODE_PATTERN);
      expect(code.slice(2)).not.toMatch(/[01OIL]/);
    }
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/domain`
Expected: FAIL — `Failed to resolve import "./order-code"`.

- [ ] **Step 3: Implementar**

`packages/domain/src/order-code.ts`:

```ts
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const ORDER_CODE_PATTERN = /^F-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export function generateOrderCode(random: () => number = Math.random): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return `F-${suffix}`;
}
```

Agregar a `packages/domain/src/index.ts`:

```ts
export * from "./order-code";
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/domain && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/order-code.ts packages/domain/src/order-code.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): generate unambiguous order codes"
```

---

### Task 4: Modelo del pedido

**Files:**

- Create: `packages/domain/src/order.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/order.test.ts`

**Interfaces:**

- Produces:
  - `ORDER_LIMITS = { maxLines: 20, maxUnitsPerLine: 2 }`
  - `ORDER_TTL = { draftMs: 259_200_000, sentMs: 172_800_000 }` (3 días y 48 horas)
  - `type LineKey = { productId: number; optionId?: number }`
  - `type OrderLine = LineKey & { qty: number }`
  - `type Order = { code: string; items: OrderLine[]; customerName?: string; note?: string; updatedAt: string; sentAt?: string }`
  - `type AddOutcome = "added" | "increased" | "unit_limit" | "line_limit" | "already_sent"`
  - `createOrder(code: string, now: Date): Order`
  - `addItem(order: Order, key: LineKey, now: Date): { order: Order; outcome: AddOutcome }`
  - `setQty(order: Order, key: LineKey, qty: number, now: Date): Order`
  - `removeItem(order: Order, key: LineKey, now: Date): Order`
  - `setCustomer(order: Order, fields: { customerName?: string; note?: string }, now: Date): Order`
  - `markSent(order: Order, now: Date): Order`
  - `pruneUnavailable(order: Order, isAvailable: (line: OrderLine) => boolean, now: Date): Order`
  - `isExpired(order: Order, now: Date): boolean`
  - `unitCount(order: Order): number`

Todas las funciones son puras: devuelven un pedido nuevo y nunca modifican el que reciben. Cualquier cambio actualiza `updatedAt`; si no cambia nada, se devuelve el mismo objeto.

- [ ] **Step 1: Escribir la prueba que falla**

`packages/domain/src/order.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addItem,
  createOrder,
  isExpired,
  markSent,
  ORDER_LIMITS,
  pruneUnavailable,
  removeItem,
  setCustomer,
  setQty,
  unitCount,
  type Order,
} from "./order";

const T0 = new Date("2026-09-19T15:00:00Z");
const later = (ms: number) => new Date(T0.getTime() + ms);
const HOUR = 60 * 60 * 1000;

describe("createOrder", () => {
  it("crea un pedido vacío con su código y fecha", () => {
    expect(createOrder("F-7K2Q", T0)).toEqual({
      code: "F-7K2Q",
      items: [],
      updatedAt: T0.toISOString(),
    });
  });
});

describe("addItem", () => {
  it("suma un producto nuevo con cantidad 1", () => {
    const { order, outcome } = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 1 },
      later(1000),
    );
    expect(outcome).toBe("added");
    expect(order.items).toEqual([{ productId: 1, qty: 1 }]);
    expect(order.updatedAt).toBe(later(1000).toISOString());
  });

  it("si el producto ya está, suma una unidad", () => {
    const first = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 1 },
      T0,
    ).order;
    const { order, outcome } = addItem(first, { productId: 1 }, T0);
    expect(outcome).toBe("increased");
    expect(order.items).toEqual([{ productId: 1, qty: 2 }]);
  });

  it(`no pasa de ${ORDER_LIMITS.maxUnitsPerLine} unidades por producto`, () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 1 }, T0).order;
    const result = addItem(order, { productId: 1 }, T0);
    expect(result.outcome).toBe("unit_limit");
    expect(result.order).toBe(order);
  });

  it("el mismo producto con otro talle es otra línea", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
    order = addItem(order, { productId: 3, optionId: 32 }, T0).order;
    expect(order.items).toEqual([
      { productId: 3, optionId: 31, qty: 1 },
      { productId: 3, optionId: 32, qty: 1 },
    ]);
  });

  it(`no acepta más de ${ORDER_LIMITS.maxLines} productos distintos`, () => {
    let order = createOrder("F-7K2Q", T0);
    for (let id = 1; id <= ORDER_LIMITS.maxLines; id++)
      order = addItem(order, { productId: id }, T0).order;
    const result = addItem(order, { productId: 999 }, T0);
    expect(result.outcome).toBe("line_limit");
    expect(result.order.items).toHaveLength(ORDER_LIMITS.maxLines);
  });

  it("no modifica un pedido ya enviado", () => {
    const sent = markSent(
      addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order,
      T0,
    );
    const result = addItem(sent, { productId: 2 }, T0);
    expect(result.outcome).toBe("already_sent");
    expect(result.order).toBe(sent);
  });
});

describe("setQty y removeItem", () => {
  const base = addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order;

  it("cambia la cantidad sin pasar el máximo", () => {
    expect(setQty(base, { productId: 1 }, 5, T0).items).toEqual([
      { productId: 1, qty: 2 },
    ]);
  });

  it("con cantidad 0 quita la línea", () => {
    expect(setQty(base, { productId: 1 }, 0, T0).items).toEqual([]);
  });

  it("quitar una línea que no existe devuelve el mismo pedido", () => {
    expect(removeItem(base, { productId: 42 }, T0)).toBe(base);
  });
});

describe("setCustomer", () => {
  it("guarda nombre y comentario sin espacios de más, y borra los vacíos", () => {
    const order = setCustomer(
      createOrder("F-7K2Q", T0),
      { customerName: "  Sofía ", note: "   " },
      T0,
    );
    expect(order.customerName).toBe("Sofía");
    expect(order.note).toBeUndefined();
  });
});

describe("pruneUnavailable", () => {
  it("quita los productos que ya no están disponibles", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 2 }, T0).order;
    const pruned = pruneUnavailable(
      order,
      (line) => line.productId !== 2,
      later(HOUR),
    );
    expect(pruned.items).toEqual([{ productId: 1, qty: 1 }]);
    expect(pruned.updatedAt).toBe(later(HOUR).toISOString());
  });

  it("si no quita nada, devuelve el mismo pedido", () => {
    const order = addItem(
      createOrder("F-7K2Q", T0),
      { productId: 1 },
      T0,
    ).order;
    expect(pruneUnavailable(order, () => true, later(HOUR))).toBe(order);
  });
});

describe("isExpired", () => {
  const draft: Order = addItem(
    createOrder("F-7K2Q", T0),
    { productId: 1 },
    T0,
  ).order;

  it("un pedido sin enviar vence a los 3 días del último cambio", () => {
    expect(isExpired(draft, later(72 * HOUR - 1))).toBe(false);
    expect(isExpired(draft, later(72 * HOUR))).toBe(true);
  });

  it("un pedido enviado vence a las 48 horas del envío", () => {
    const sent = markSent(draft, T0);
    expect(isExpired(sent, later(48 * HOUR - 1))).toBe(false);
    expect(isExpired(sent, later(48 * HOUR))).toBe(true);
  });
});

describe("unitCount", () => {
  it("suma las unidades de todas las líneas", () => {
    let order = createOrder("F-7K2Q", T0);
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 1 }, T0).order;
    order = addItem(order, { productId: 2 }, T0).order;
    expect(unitCount(order)).toBe(3);
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/domain`
Expected: FAIL — `Failed to resolve import "./order"`.

- [ ] **Step 3: Implementar**

`packages/domain/src/order.ts`:

```ts
export const ORDER_LIMITS = { maxLines: 20, maxUnitsPerLine: 2 } as const;

const HOUR_MS = 60 * 60 * 1000;
export const ORDER_TTL = {
  draftMs: 72 * HOUR_MS,
  sentMs: 48 * HOUR_MS,
} as const;

export type LineKey = { productId: number; optionId?: number };
export type OrderLine = LineKey & { qty: number };
export type Order = {
  code: string;
  items: OrderLine[];
  customerName?: string;
  note?: string;
  updatedAt: string;
  sentAt?: string;
};
export type AddOutcome =
  "added" | "increased" | "unit_limit" | "line_limit" | "already_sent";

function sameLine(a: LineKey, b: LineKey): boolean {
  return (
    a.productId === b.productId && (a.optionId ?? null) === (b.optionId ?? null)
  );
}

function touch(order: Order, now: Date, changes: Partial<Order>): Order {
  return { ...order, ...changes, updatedAt: now.toISOString() };
}

export function createOrder(code: string, now: Date): Order {
  return { code, items: [], updatedAt: now.toISOString() };
}

export function addItem(
  order: Order,
  key: LineKey,
  now: Date,
): { order: Order; outcome: AddOutcome } {
  if (order.sentAt) return { order, outcome: "already_sent" };

  const existing = order.items.find((line) => sameLine(line, key));
  if (existing) {
    if (existing.qty >= ORDER_LIMITS.maxUnitsPerLine)
      return { order, outcome: "unit_limit" };
    const items = order.items.map((line) =>
      line === existing ? { ...line, qty: line.qty + 1 } : line,
    );
    return { order: touch(order, now, { items }), outcome: "increased" };
  }

  if (order.items.length >= ORDER_LIMITS.maxLines)
    return { order, outcome: "line_limit" };

  const line: OrderLine =
    key.optionId === undefined
      ? { productId: key.productId, qty: 1 }
      : { productId: key.productId, optionId: key.optionId, qty: 1 };
  return {
    order: touch(order, now, { items: [...order.items, line] }),
    outcome: "added",
  };
}

export function removeItem(order: Order, key: LineKey, now: Date): Order {
  const items = order.items.filter((line) => !sameLine(line, key));
  return items.length === order.items.length
    ? order
    : touch(order, now, { items });
}

export function setQty(
  order: Order,
  key: LineKey,
  qty: number,
  now: Date,
): Order {
  if (!order.items.some((line) => sameLine(line, key))) return order;
  if (qty <= 0) return removeItem(order, key, now);
  const clamped = Math.min(Math.floor(qty), ORDER_LIMITS.maxUnitsPerLine);
  const items = order.items.map((line) =>
    sameLine(line, key) ? { ...line, qty: clamped } : line,
  );
  return touch(order, now, { items });
}

export function setCustomer(
  order: Order,
  fields: { customerName?: string; note?: string },
  now: Date,
): Order {
  const customerName = fields.customerName?.trim() || undefined;
  const note = fields.note?.trim() || undefined;
  return touch(order, now, { customerName, note });
}

export function markSent(order: Order, now: Date): Order {
  return touch(order, now, { sentAt: now.toISOString() });
}

export function pruneUnavailable(
  order: Order,
  isAvailable: (line: OrderLine) => boolean,
  now: Date,
): Order {
  const items = order.items.filter(isAvailable);
  return items.length === order.items.length
    ? order
    : touch(order, now, { items });
}

export function isExpired(order: Order, now: Date): boolean {
  const reference = order.sentAt ?? order.updatedAt;
  const ttl = order.sentAt ? ORDER_TTL.sentMs : ORDER_TTL.draftMs;
  return now.getTime() - Date.parse(reference) >= ttl;
}

export function unitCount(order: Order): number {
  return order.items.reduce((total, line) => total + line.qty, 0);
}
```

Agregar a `packages/domain/src/index.ts`:

```ts
export * from "./order";
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/domain && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/order.ts packages/domain/src/order.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): add order model with limits and expiry"
```

---

### Task 5: Guardar el pedido en el navegador

**Files:**

- Create: `packages/domain/src/order-storage.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/order-storage.test.ts`

**Interfaces:**

- Consumes: `type Order`, `type OrderLine`, `isExpired`, `ORDER_LIMITS` (Task 4)
- Produces:
  - `ORDER_STORAGE_KEY = "falco.order.v1"`
  - `interface KeyValueStorage { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }`
  - `isOrder(value: unknown): value is Order`
  - `loadOrder(storage: KeyValueStorage | null, now: Date): Order | null`
  - `saveOrder(storage: KeyValueStorage | null, order: Order): boolean`
  - `clearOrder(storage: KeyValueStorage | null): void`

`localStorage` puede no existir o tirar error (ventana privada, datos bloqueados). Por eso ninguna función de este archivo tira errores: si algo falla, el sitio sigue funcionando como si no hubiera pedido. Se usa una interfaz propia en lugar del tipo `Storage` del navegador para que el paquete no dependa del DOM.

- [ ] **Step 1: Escribir la prueba que falla**

`packages/domain/src/order-storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addItem, createOrder, markSent } from "./order";
import {
  clearOrder,
  loadOrder,
  ORDER_STORAGE_KEY,
  saveOrder,
  type KeyValueStorage,
} from "./order-storage";

function memoryStorage(
  initial: Record<string, string> = {},
): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
    removeItem: (key) => {
      delete data[key];
    },
  };
}

const brokenStorage: KeyValueStorage = {
  getItem: () => {
    throw new Error("blocked");
  },
  setItem: () => {
    throw new Error("blocked");
  },
  removeItem: () => {
    throw new Error("blocked");
  },
};

const T0 = new Date("2026-09-19T15:00:00Z");
const HOUR = 60 * 60 * 1000;
const order = addItem(createOrder("F-7K2Q", T0), { productId: 1 }, T0).order;

describe("saveOrder y loadOrder", () => {
  it("guarda y vuelve a leer el mismo pedido", () => {
    const storage = memoryStorage();
    expect(saveOrder(storage, order)).toBe(true);
    expect(loadOrder(storage, T0)).toEqual(order);
  });

  it("devuelve null si no hay pedido guardado", () => {
    expect(loadOrder(memoryStorage(), T0)).toBeNull();
  });

  it("borra y descarta un pedido vencido", () => {
    const storage = memoryStorage();
    saveOrder(storage, markSent(order, T0));
    expect(loadOrder(storage, new Date(T0.getTime() + 48 * HOUR))).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un JSON roto", () => {
    const storage = memoryStorage({ [ORDER_STORAGE_KEY]: "{no es json" });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("borra y descarta un objeto que no es un pedido", () => {
    const storage = memoryStorage({
      [ORDER_STORAGE_KEY]: JSON.stringify({
        code: "F-7K2Q",
        items: [{ productId: "1", qty: 9 }],
      }),
    });
    expect(loadOrder(storage, T0)).toBeNull();
    expect(storage.data[ORDER_STORAGE_KEY]).toBeUndefined();
  });

  it("no tira errores si el navegador bloquea el almacenamiento", () => {
    expect(saveOrder(brokenStorage, order)).toBe(false);
    expect(loadOrder(brokenStorage, T0)).toBeNull();
    expect(() => clearOrder(brokenStorage)).not.toThrow();
  });

  it("funciona sin almacenamiento disponible", () => {
    expect(saveOrder(null, order)).toBe(false);
    expect(loadOrder(null, T0)).toBeNull();
  });
});

describe("clearOrder", () => {
  it("borra el pedido guardado", () => {
    const storage = memoryStorage();
    saveOrder(storage, order);
    clearOrder(storage);
    expect(loadOrder(storage, T0)).toBeNull();
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/domain`
Expected: FAIL — `Failed to resolve import "./order-storage"`.

- [ ] **Step 3: Implementar**

`packages/domain/src/order-storage.ts`:

```ts
import { isExpired, ORDER_LIMITS, type Order, type OrderLine } from "./order";

export const ORDER_STORAGE_KEY = "falco.order.v1";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isPositiveInt = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));
const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

function isOrderLine(value: unknown): value is OrderLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    isPositiveInt(line.productId) &&
    (line.optionId === undefined || isPositiveInt(line.optionId)) &&
    isPositiveInt(line.qty) &&
    (line.qty as number) <= ORDER_LIMITS.maxUnitsPerLine
  );
}

export function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.code === "string" &&
    isIsoDate(order.updatedAt) &&
    (order.sentAt === undefined || isIsoDate(order.sentAt)) &&
    isOptionalString(order.customerName) &&
    isOptionalString(order.note) &&
    Array.isArray(order.items) &&
    order.items.length <= ORDER_LIMITS.maxLines &&
    order.items.every(isOrderLine)
  );
}

export function clearOrder(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(ORDER_STORAGE_KEY);
  } catch {
    // El navegador bloquea el almacenamiento: no hay nada que borrar.
  }
}

export function loadOrder(
  storage: KeyValueStorage | null,
  now: Date,
): Order | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isOrder(parsed) && !isExpired(parsed, now)) return parsed;
  } catch {
    // JSON roto: se borra abajo.
  }
  clearOrder(storage);
  return null;
}

export function saveOrder(
  storage: KeyValueStorage | null,
  order: Order,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}
```

Agregar a `packages/domain/src/index.ts`:

```ts
export * from "./order-storage";
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/domain && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/order-storage.ts packages/domain/src/order-storage.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): persist order safely in browser storage"
```

---

### Task 6: Mensaje y link de WhatsApp

**Files:**

- Create: `packages/domain/src/message.ts`
- Modify: `packages/domain/src/index.ts`
- Test: `packages/domain/src/message.test.ts`

**Interfaces:**

- Consumes: `type Order`, `type OrderLine` (Task 4)
- Produces:
  - `type CatalogProduct = { id: number; name: string; detail: string; priceArs: number; options?: readonly { id: number; label: string }[] }`
  - `type Catalog = ReadonlyMap<number, CatalogProduct>`
  - `formatArs(amount: number): string` (`41000` → `"$ 41.000"`)
  - `orderTotal(order: Order, catalog: Catalog): number`
  - `buildOrderMessage(order: Order, catalog: Catalog): string`
  - `buildWhatsAppUrl(whatsappNumber: string, message: string): string`

- [ ] **Step 1: Escribir la prueba que falla**

`packages/domain/src/message.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addItem, createOrder, setCustomer, type Order } from "./order";
import {
  buildOrderMessage,
  buildWhatsAppUrl,
  formatArs,
  orderTotal,
  type Catalog,
} from "./message";

const T0 = new Date("2026-09-19T15:00:00Z");

const CATALOG: Catalog = new Map([
  [
    1,
    {
      id: 1,
      name: "Huila · Colombia",
      detail: "250 g · en grano",
      priceArs: 12000,
    },
  ],
  [
    2,
    { id: 2, name: "Filtros V60 · 02", detail: "Caja de 100", priceArs: 6500 },
  ],
  [
    3,
    {
      id: 3,
      name: "Remera Falco",
      detail: "Algodón",
      priceArs: 16000,
      options: [{ id: 31, label: "M" }],
    },
  ],
]);

function sampleOrder(): Order {
  let order = createOrder("F-7K2Q", T0);
  order = addItem(order, { productId: 1 }, T0).order;
  order = addItem(order, { productId: 2 }, T0).order;
  order = addItem(order, { productId: 2 }, T0).order;
  order = addItem(order, { productId: 3, optionId: 31 }, T0).order;
  return order;
}

describe("formatArs", () => {
  it("usa punto como separador de miles", () => {
    expect(formatArs(500)).toBe("$ 500");
    expect(formatArs(41000)).toBe("$ 41.000");
    expect(formatArs(1234567)).toBe("$ 1.234.567");
  });
});

describe("orderTotal", () => {
  it("suma precio por cantidad", () => {
    expect(orderTotal(sampleOrder(), CATALOG)).toBe(41000);
  });
});

describe("buildOrderMessage", () => {
  it("arma el mensaje completo con nombre y comentario", () => {
    const order = setCustomer(
      sampleOrder(),
      { customerName: "Sofía", note: "Paso a la tarde" },
      T0,
    );
    expect(buildOrderMessage(order, CATALOG)).toBe(
      [
        "¡Buenas! Soy Sofía y quiero hacer este pedido (F-7K2Q):",
        "",
        "• 1 × Huila · Colombia · 250 g · en grano",
        "• 2 × Filtros V60 · 02 · Caja de 100",
        "• 1 × Remera Falco · Algodón · talle M",
        "",
        "Total estimado: $ 41.000",
        "Lo retiraría en el local cuando me confirmen.",
        "Comentario: Paso a la tarde.",
        "",
        "¿Me confirman si hay stock y desde qué hora lo puedo retirar?",
      ].join("\n"),
    );
  });

  it("sin nombre ni comentario, usa el saludo corto y no agrega la línea del comentario", () => {
    const message = buildOrderMessage(sampleOrder(), CATALOG);
    expect(
      message.startsWith("¡Buenas! Quiero hacer este pedido (F-7K2Q):\n"),
    ).toBe(true);
    expect(message).not.toContain("Comentario");
  });

  it("no duplica el punto si el comentario ya termina con signo", () => {
    const order = setCustomer(sampleOrder(), { note: "¿Tienen bolsas?" }, T0);
    expect(buildOrderMessage(order, CATALOG)).toContain(
      "Comentario: ¿Tienen bolsas?\n",
    );
  });

  it("nunca usa palabras que den el pedido por hecho", () => {
    const message = buildOrderMessage(sampleOrder(), CATALOG).toLowerCase();
    for (const word of ["comprado", "listo", "pedido hecho"])
      expect(message).not.toContain(word);
  });
});

describe("buildWhatsAppUrl", () => {
  it("deja solo los dígitos del número y codifica el mensaje", () => {
    expect(buildWhatsAppUrl("+54 9 342 555-1234", "¡Hola!\nSí")).toBe(
      "https://wa.me/5493425551234?text=%C2%A1Hola!%0AS%C3%AD",
    );
  });

  it("rechaza un número demasiado corto", () => {
    expect(() => buildWhatsAppUrl("342 555", "Hola")).toThrow();
  });
});
```

- [ ] **Step 2: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/domain`
Expected: FAIL — `Failed to resolve import "./message"`.

- [ ] **Step 3: Implementar**

`packages/domain/src/message.ts`:

```ts
import type { Order, OrderLine } from "./order";

export type CatalogProduct = {
  id: number;
  name: string;
  detail: string;
  priceArs: number;
  options?: readonly { id: number; label: string }[];
};
export type Catalog = ReadonlyMap<number, CatalogProduct>;

const CLOSING_QUESTION =
  "¿Me confirman si hay stock y desde qué hora lo puedo retirar?";

export function formatArs(amount: number): string {
  const rounded = Math.round(amount).toString();
  return `$ ${rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function orderTotal(order: Order, catalog: Catalog): number {
  return order.items.reduce(
    (total, line) =>
      total + (catalog.get(line.productId)?.priceArs ?? 0) * line.qty,
    0,
  );
}

function lineText(line: OrderLine, product: CatalogProduct): string {
  const option =
    line.optionId === undefined
      ? undefined
      : product.options?.find((o) => o.id === line.optionId);
  const parts = [`${line.qty} × ${product.name}`, product.detail];
  if (option) parts.push(`talle ${option.label}`);
  return `• ${parts.join(" · ")}`;
}

function endWithPunctuation(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

export function buildOrderMessage(order: Order, catalog: Catalog): string {
  const name = order.customerName?.trim();
  const greeting = name
    ? `¡Buenas! Soy ${name} y quiero hacer este pedido (${order.code}):`
    : `¡Buenas! Quiero hacer este pedido (${order.code}):`;

  const lines = order.items.flatMap((line) => {
    const product = catalog.get(line.productId);
    return product ? [lineText(line, product)] : [];
  });

  const note = order.note?.trim();

  return [
    greeting,
    "",
    ...lines,
    "",
    `Total estimado: ${formatArs(orderTotal(order, catalog))}`,
    "Lo retiraría en el local cuando me confirmen.",
    ...(note ? [`Comentario: ${endWithPunctuation(note)}`] : []),
    "",
    CLOSING_QUESTION,
  ].join("\n");
}

export function buildWhatsAppUrl(
  whatsappNumber: string,
  message: string,
): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  if (digits.length < 10)
    throw new Error(`Invalid WhatsApp number: ${whatsappNumber}`);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

Agregar a `packages/domain/src/index.ts`:

```ts
export * from "./message";
```

- [ ] **Step 4: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/domain && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/domain/src/message.ts packages/domain/src/message.test.ts packages/domain/src/index.ts
git commit -m "feat(domain): build whatsapp order message and link"
```

---

### Task 7: Base de datos: migración y datos de prueba

**Files:**

- Create: `packages/db/package.json`, `packages/db/tsconfig.json`
- Create: `packages/db/migrations/0001_init.sql`
- Create: `packages/db/seed/seed.sql`
- Create: `packages/db/src/index.ts`
- Test: `packages/db/test/migrations.test.ts`

**Interfaces:**

- Produces: tablas `coffees`, `products`, `product_options`, `business_hours`, `special_days`, `settings`, con las columnas y restricciones de abajo. Claves de `settings`: `hopper_coffee_id`, `whatsapp_number`, `menu_url`, `instagram_url`.

D1 es SQLite, así que la migración se prueba con SQLite en memoria (better-sqlite3). D1 tiene las claves foráneas activadas por defecto; en la prueba se activan a mano con `PRAGMA foreign_keys = ON`.

- [ ] **Step 1: Crear el paquete**

`packages/db/package.json`:

```json
{
  "name": "@falco/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  }
}
```

`packages/db/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test"]
}
```

```bash
npm install --workspace @falco/db zod@^3.23
npm install --workspace @falco/db --save-dev better-sqlite3 @types/better-sqlite3 @types/node
```

`packages/db/src/index.ts` (por ahora vacío; en la Task 8 exporta los esquemas):

```ts
export {};
```

- [ ] **Step 2: Escribir la prueba que falla**

`packages/db/test/migrations.test.ts`:

```ts
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

describe("0001_init + seed", () => {
  it("carga los datos de prueba", () => {
    expect(count("coffees")).toBe(1);
    expect(count("products")).toBe(3);
    expect(count("product_options")).toBe(4);
    expect(count("business_hours")).toBe(7);
    const hopper = db
      .prepare("SELECT value FROM settings WHERE key = 'hopper_coffee_id'")
      .get() as { value: string };
    expect(hopper.value).toBe("1");
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

  it("al borrar un producto se borran sus talles", () => {
    db.prepare("DELETE FROM products WHERE slug = 'remera-falco'").run();
    expect(count("product_options")).toBe(0);
  });

  it("no deja borrar un café que usa un producto", () => {
    expect(() => db.prepare("DELETE FROM coffees WHERE id = 1").run()).toThrow(
      /FOREIGN KEY/,
    );
  });

  it("un día abierto necesita hora de apertura y de cierre", () => {
    expect(() =>
      db
        .prepare("UPDATE business_hours SET opens_at = NULL WHERE weekday = 1")
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .prepare(
          "UPDATE business_hours SET is_closed = 1, opens_at = NULL, closes_at = NULL WHERE weekday = 1",
        )
        .run(),
    ).not.toThrow();
  });
});
```

- [ ] **Step 3: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/db`
Expected: FAIL — `ENOENT: no such file or directory ... 0001_init.sql`.

- [ ] **Step 4: Escribir la migración y los datos de prueba**

`packages/db/migrations/0001_init.sql`:

```sql
-- Cafés: catálogo. Un café puede estar en la tolva, en la tienda, o en los dos.
CREATE TABLE coffees (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,
  farm            TEXT,
  country         TEXT NOT NULL,
  variety         TEXT,
  process         TEXT,
  altitude_masl   INTEGER CHECK (altitude_masl IS NULL OR altitude_masl BETWEEN 0 AND 3000),
  tasting_notes   TEXT,
  description     TEXT,
  roaster         TEXT NOT NULL DEFAULT 'Puerto Blest',
  acidity         INTEGER NOT NULL CHECK (acidity BETWEEN 1 AND 5),
  sweetness       INTEGER NOT NULL CHECK (sweetness BETWEEN 1 AND 5),
  body            INTEGER NOT NULL CHECK (body BETWEEN 1 AND 5),
  aroma           INTEGER NOT NULL CHECK (aroma BETWEEN 1 AND 5),
  finish          INTEGER NOT NULL CHECK (finish BETWEEN 1 AND 5),
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      TEXT
);

-- Productos de la tienda.
CREATE TABLE products (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  kind            TEXT NOT NULL CHECK (kind IN ('coffee', 'gear', 'kit', 'apparel')),
  shelf           TEXT NOT NULL CHECK (shelf IN ('coffee', 'kits')),
  coffee_id       INTEGER REFERENCES coffees(id),
  name            TEXT NOT NULL,
  detail          TEXT NOT NULL,
  description     TEXT,
  price_ars       INTEGER NOT NULL CHECK (price_ars >= 0),
  image_key       TEXT,
  is_new          INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
  is_visible      INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  ask_stock       INTEGER NOT NULL DEFAULT 0 CHECK (ask_stock IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      TEXT,
  CHECK (kind = 'coffee' OR coffee_id IS NULL)
);

-- Opciones de un producto (por ahora, talles de remera).
CREATE TABLE product_options (
  id              INTEGER PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  is_available    INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, label)
);

-- Horario semanal. weekday: 0 = domingo … 6 = sábado. Horas de Argentina, "HH:MM" o "24:00".
CREATE TABLE business_hours (
  weekday         INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_closed       INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  opens_at        TEXT,
  closes_at       TEXT,
  CHECK (is_closed = 1 OR (opens_at IS NOT NULL AND closes_at IS NOT NULL))
);

-- Feriados y días con horario distinto. Tienen prioridad sobre business_hours.
CREATE TABLE special_days (
  date            TEXT PRIMARY KEY,
  is_closed       INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  opens_at        TEXT,
  closes_at       TEXT,
  note            TEXT,
  CHECK (is_closed = 1 OR (opens_at IS NOT NULL AND closes_at IS NOT NULL))
);

-- Ajustes sueltos. Claves: hopper_coffee_id, whatsapp_number, menu_url, instagram_url.
CREATE TABLE settings (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      TEXT
);

CREATE INDEX products_shelf_order ON products (shelf, sort_order);
```

`packages/db/seed/seed.sql` (datos de ejemplo para desarrollo; los precios y el número son de mentira):

```sql
INSERT INTO coffees (id, name, farm, country, variety, process, altitude_masl, tasting_notes, description, acidity, sweetness, body, aroma, finish)
VALUES (1, 'Huila', 'Finca La Esperanza', 'Colombia', 'Caturra', 'Lavado', 1750, 'Durazno, panela, cítrico',
        'Luminoso y dulce. Se parece a un té de durazno, sin amargor.', 4, 5, 2, 4, 3);

INSERT INTO products (id, slug, kind, shelf, coffee_id, name, detail, price_ars, is_new, sort_order) VALUES
  (1, 'huila-colombia', 'coffee', 'coffee', 1, 'Huila · Colombia', '250 g · en grano', 12000, 1, 1),
  (2, 'filtros-v60-02', 'gear', 'kits', NULL, 'Filtros V60 · 02', 'Caja de 100', 6500, 0, 1),
  (3, 'remera-falco', 'apparel', 'kits', NULL, 'Remera Falco', 'Algodón', 16000, 0, 2);

INSERT INTO product_options (product_id, label, sort_order) VALUES
  (3, 'S', 1), (3, 'M', 2), (3, 'L', 3), (3, 'XL', 4);

INSERT INTO business_hours (weekday, is_closed, opens_at, closes_at) VALUES
  (0, 0, '15:00', '20:00'),
  (1, 0, '08:00', '20:00'),
  (2, 0, '08:00', '20:00'),
  (3, 0, '08:00', '20:00'),
  (4, 0, '08:00', '20:00'),
  (5, 0, '08:00', '20:00'),
  (6, 0, '08:00', '20:00');

INSERT INTO settings (key, value) VALUES
  ('hopper_coffee_id', '1'),
  ('whatsapp_number', '5493420000000'),
  ('menu_url', 'https://drive.google.com/'),
  ('instagram_url', 'https://www.instagram.com/falco.cafe/');
```

- [ ] **Step 5: Correr la prueba y verificar que pasa**

Run: `npm test --workspace @falco/db`
Expected: PASS (8 pruebas).

- [ ] **Step 6: Commit**

```bash
git add packages/db package.json package-lock.json
git commit -m "feat(db): add initial d1 schema and seed data"
```

---

### Task 8: Validaciones compartidas (zod) y slugs

**Files:**

- Create: `packages/db/src/schemas.ts`, `packages/db/src/slug.ts`
- Modify: `packages/db/src/index.ts`
- Test: `packages/db/src/schemas.test.ts`, `packages/db/src/slug.test.ts`

**Interfaces:**

- Produces:
  - `slugify(text: string): string`
  - `timeSchema`, `dayHoursSchema`, `weekHoursSchema`, `specialDaySchema`, `coffeeInputSchema`, `productInputSchema`, `productOptionInputSchema`, `settingsSchema`
  - Tipos: `DayHoursInput`, `SpecialDayInput`, `CoffeeInput`, `ProductInput`, `ProductOptionInput`, `SettingsInput` (con `z.infer`)

Los mensajes de error están en español porque el admin los muestra tal cual al lado de cada campo. Los nombres de campos están en camelCase; los planes 2 y 3 hacen la conversión a las columnas snake_case de la base.

- [ ] **Step 1: Escribir las pruebas que fallan**

`packages/db/src/slug.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("pasa a minúsculas, saca tildes y reemplaza espacios por guiones", () => {
    expect(slugify("Kit V60 completo")).toBe("kit-v60-completo");
    expect(slugify("Etiopía natural")).toBe("etiopia-natural");
  });

  it("saca signos y guiones repetidos o en los bordes", () => {
    expect(slugify("  Huila · Colombia!! ")).toBe("huila-colombia");
    expect(slugify("Filtros V60 · 02")).toBe("filtros-v60-02");
  });
});
```

`packages/db/src/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  coffeeInputSchema,
  dayHoursSchema,
  productInputSchema,
  settingsSchema,
  specialDaySchema,
  timeSchema,
  weekHoursSchema,
} from "./schemas";

const firstError = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => (result.success ? undefined : result.error?.issues[0]?.message);

describe("timeSchema", () => {
  it("acepta HH:MM y 24:00", () => {
    expect(timeSchema.safeParse("08:00").success).toBe(true);
    expect(timeSchema.safeParse("24:00").success).toBe(true);
  });

  it("rechaza otros formatos con un mensaje claro", () => {
    expect(firstError(timeSchema.safeParse("8:00"))).toBe(
      "Usá el formato HH:MM, por ejemplo 08:30.",
    );
  });
});

describe("dayHoursSchema", () => {
  it("un día cerrado no necesita horas", () => {
    expect(
      dayHoursSchema.safeParse({
        isClosed: true,
        opensAt: null,
        closesAt: null,
      }).success,
    ).toBe(true);
  });

  it("un día abierto necesita las dos horas", () => {
    expect(
      firstError(
        dayHoursSchema.safeParse({
          isClosed: false,
          opensAt: "08:00",
          closesAt: null,
        }),
      ),
    ).toBe("Completá la hora de apertura y la de cierre.");
  });

  it("el cierre tiene que ser después de la apertura", () => {
    expect(
      firstError(
        dayHoursSchema.safeParse({
          isClosed: false,
          opensAt: "20:00",
          closesAt: "08:00",
        }),
      ),
    ).toBe("La hora de cierre tiene que ser después de la de apertura.");
  });
});

describe("weekHoursSchema", () => {
  const day = { isClosed: false, opensAt: "08:00", closesAt: "20:00" };

  it("necesita los 7 días, del 0 al 6, sin repetir", () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, ...day }));
    expect(weekHoursSchema.safeParse(week).success).toBe(true);
    expect(weekHoursSchema.safeParse(week.slice(0, 6)).success).toBe(false);
    expect(
      weekHoursSchema.safeParse([...week.slice(0, 6), { weekday: 1, ...day }])
        .success,
    ).toBe(false);
  });
});

describe("specialDaySchema", () => {
  it("valida la fecha", () => {
    expect(
      specialDaySchema.safeParse({
        date: "2026-12-25",
        isClosed: true,
        opensAt: null,
        closesAt: null,
        note: "Navidad",
      }).success,
    ).toBe(true);
    expect(
      firstError(
        specialDaySchema.safeParse({
          date: "25/12/2026",
          isClosed: true,
          opensAt: null,
          closesAt: null,
        }),
      ),
    ).toBe("Usá una fecha válida.");
  });
});

describe("coffeeInputSchema", () => {
  const valid = {
    name: "Huila",
    country: "Colombia",
    acidity: 4,
    sweetness: 5,
    body: 2,
    aroma: 4,
    finish: 3,
  };

  it("acepta un café mínimo y completa el tostadero", () => {
    const result = coffeeInputSchema.parse(valid);
    expect(result.roaster).toBe("Puerto Blest");
  });

  it("los valores del pentágono van de 1 a 5", () => {
    expect(firstError(coffeeInputSchema.safeParse({ ...valid, body: 6 }))).toBe(
      "Tiene que ser un número del 1 al 5.",
    );
  });
});

describe("productInputSchema", () => {
  const valid = {
    slug: "remera-falco",
    kind: "apparel",
    shelf: "kits",
    name: "Remera Falco",
    detail: "Algodón",
    priceArs: 16000,
  };

  it("acepta un producto y completa los valores por defecto", () => {
    const result = productInputSchema.parse(valid);
    expect(result).toMatchObject({
      isNew: false,
      isVisible: true,
      askStock: false,
      sortOrder: 0,
    });
  });

  it("el precio es un entero en pesos, sin centavos", () => {
    expect(
      firstError(productInputSchema.safeParse({ ...valid, priceArs: 1600.5 })),
    ).toBe("Poné el precio en pesos, sin centavos.");
  });

  it("solo un café puede estar vinculado a un café del catálogo", () => {
    expect(
      firstError(productInputSchema.safeParse({ ...valid, coffeeId: 1 })),
    ).toBe(
      "Solo los productos de tipo café se vinculan a un café del catálogo.",
    );
  });

  it("el slug solo lleva minúsculas, números y guiones", () => {
    expect(
      firstError(
        productInputSchema.safeParse({ ...valid, slug: "Remera Falco" }),
      ),
    ).toBe("Usá solo minúsculas, números y guiones.");
  });
});

describe("settingsSchema", () => {
  it("normaliza el número de WhatsApp a solo dígitos", () => {
    const result = settingsSchema.parse({
      hopperCoffeeId: 1,
      whatsappNumber: "+54 9 342 555-1234",
      menuUrl: "https://drive.google.com/file/d/abc/view",
      instagramUrl: "https://www.instagram.com/falco.cafe/",
    });
    expect(result.whatsappNumber).toBe("5493425551234");
  });

  it("el link de la carta tiene que ser https", () => {
    expect(
      firstError(
        settingsSchema.safeParse({
          hopperCoffeeId: null,
          whatsappNumber: "5493425551234",
          menuUrl: "http://drive.google.com/x",
          instagramUrl: "https://www.instagram.com/falco.cafe/",
        }),
      ),
    ).toBe("Pegá un link que empiece con https://");
  });
});
```

- [ ] **Step 2: Correr las pruebas y verificar que fallan**

Run: `npm test --workspace @falco/db`
Expected: FAIL — `Failed to resolve import "./slug"` y `"./schemas"`.

- [ ] **Step 3: Implementar**

`packages/db/src/slug.ts`:

```ts
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
```

`packages/db/src/schemas.ts`:

```ts
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
```

`packages/db/src/index.ts` (reemplaza el `export {}` de la Task 7):

```ts
export * from "./schemas";
export * from "./slug";
```

- [ ] **Step 4: Correr las pruebas y verificar que pasan**

Run: `npm test --workspace @falco/db && npm run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/db/src
git commit -m "feat(db): add shared zod schemas and slugify"
```

---

### Task 9: Tokens de diseño

**Files:**

- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`
- Create: `packages/ui/src/tokens.ts`, `packages/ui/src/tokens.css`
- Test: `packages/ui/src/tokens.test.ts`

**Interfaces:**

- Produces:
  - `colors`, `angles`, `easing`, `fonts` (constantes en `tokens.ts`)
  - Variables CSS en `tokens.css`: `--color-<nombre>`, `--angle-<nombre>`, `--ease-<nombre>`, `--font-<nombre>`
  - Import en las apps: `import "@falco/ui/tokens.css"` y `import { colors } from "@falco/ui"`

Los mismos valores viven en TS (para lógica y el admin) y en CSS (para los estilos). La prueba verifica que no se desincronicen.

- [ ] **Step 1: Crear el paquete**

`packages/ui/package.json`:

```json
{
  "name": "@falco/ui",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/tokens.ts",
    "./tokens.css": "./src/tokens.css"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json"
  }
}
```

`packages/ui/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src"]
}
```

```bash
npm install --workspace @falco/ui --save-dev @types/node
```

- [ ] **Step 2: Escribir la prueba que falla**

`packages/ui/src/tokens.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { angles, colors, easing, fonts } from "./tokens";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function cssValue(name: string): string | undefined {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  return match?.[1]?.trim();
}

describe("tokens.css coincide con tokens.ts", () => {
  it.each(Object.entries(colors))("color %s", (name, value) => {
    expect(cssValue(`color-${name}`)?.toLowerCase()).toBe(value.toLowerCase());
  });

  it.each(Object.entries(angles))("ángulo %s", (name, value) => {
    expect(cssValue(`angle-${name}`)).toBe(`${value}deg`);
  });

  it.each(Object.entries(easing))("curva %s", (name, value) => {
    expect(cssValue(`ease-${name}`)).toBe(value);
  });

  it.each(Object.entries(fonts))("tipografía %s", (name, value) => {
    expect(cssValue(`font-${name}`)).toBe(value);
  });
});

describe("paleta", () => {
  it("son exactamente los 7 colores del sistema, sin rojo", () => {
    expect(Object.keys(colors)).toEqual([
      "carbon",
      "piedra",
      "sombra",
      "tostado",
      "hueso",
      "ceniza",
      "brasa",
    ]);
  });
});
```

- [ ] **Step 3: Correr la prueba y verificar que falla**

Run: `npm test --workspace @falco/ui`
Expected: FAIL — `Failed to resolve import "./tokens"`.

- [ ] **Step 4: Implementar**

`packages/ui/src/tokens.ts`:

```ts
export const colors = {
  carbon: "#292A2C",
  piedra: "#313335",
  sombra: "#1E1F21",
  tostado: "#885333",
  hueso: "#E8E2D0",
  ceniza: "#9A9C9E",
  brasa: "#F2C48B",
} as const;

/** Grados. Son fijos: no inventar ángulos nuevos. */
export const angles = {
  plate: -14,
  button: -12,
  menu: -8,
  dialog: -6,
  ticker: -1.6,
} as const;

export const easing = {
  persona: "cubic-bezier(.2, 1.2, .4, 1)",
  ambient: "cubic-bezier(.16, 1, .3, 1)",
} as const;

export const fonts = {
  display: '"Bricolage Grotesque", "Arial Narrow", system-ui, sans-serif',
  body: '"Instrument Sans", system-ui, sans-serif',
  mono: '"Martian Mono", ui-monospace, "SFMono-Regular", monospace',
} as const;
```

`packages/ui/src/tokens.css`:

```css
:root {
  --color-carbon: #292a2c;
  --color-piedra: #313335;
  --color-sombra: #1e1f21;
  --color-tostado: #885333;
  --color-hueso: #e8e2d0;
  --color-ceniza: #9a9c9e;
  --color-brasa: #f2c48b;

  --angle-plate: -14deg;
  --angle-button: -12deg;
  --angle-menu: -8deg;
  --angle-dialog: -6deg;
  --angle-ticker: -1.6deg;

  --ease-persona: cubic-bezier(0.2, 1.2, 0.4, 1);
  --ease-ambient: cubic-bezier(0.16, 1, 0.3, 1);

  --font-display: "Bricolage Grotesque", "Arial Narrow", system-ui, sans-serif;
  --font-body: "Instrument Sans", system-ui, sans-serif;
  --font-mono: "Martian Mono", ui-monospace, "SFMono-Regular", monospace;

  color-scheme: dark;
}
```

- [ ] **Step 5: Correr las pruebas y verificar que pasan**

Run: `npm test && npm run typecheck`
Expected: PASS en los tres paquetes.

- [ ] **Step 6: Commit**

```bash
git add packages/ui package.json package-lock.json
git commit -m "feat(ui): add design tokens in ts and css"
```

---

## Cierre del Plan 1

Al terminar, `npm test` pasa en `@falco/domain`, `@falco/db` y `@falco/ui`, y `npm run typecheck` no da errores. Todavía no hay nada que se vea en el navegador: eso llega en el Plan 2, que consume todo esto.

## Próximos planes (índice)

Cada uno se escribe en detalle recién cuando termina el anterior, con las versiones de Astro, del adaptador de Cloudflare y de Wrangler verificadas en ese momento.

**Plan 2 · Sitio público (`apps/site`)**

1. App Astro con SSR en Workers, binding de D1 y tipografías servidas desde el sitio.
2. Consultas de solo lectura: tolva, productos visibles con talles, horarios, días especiales y ajustes.
3. Home (sin animaciones): calendario, "Abierto ahora" (con `getOpenStatus`), misión, tolva con pentágono y foto.
4. Tienda: dos carruseles y detalle de producto (panel en escritorio, hoja en celular, `/tienda/[slug]`).
5. Pedido: isla de React con `@falco/domain` (sumar, "¡Sumado!", barra, "Tu pedido", pasos 1-2-3, "Enviar para confirmar", "Esperando confirmación").
6. Dónde estamos, `/carta` (302), 404, caché en el borde de 60 segundos.
7. Animaciones y detalles Persona según la lámina de sistema, con `prefers-reduced-motion`.
8. SEO (títulos, imagen para compartir, JSON-LD, sitemap) y métricas de Umami.
9. Prueba de punta a punta con Playwright: producto → pedido → link `wa.me` exacto.

**Plan 3 · Admin (`apps/admin`)**

1. App Astro en Workers detrás de Cloudflare Access; validación del token `Cf-Access-Jwt-Assertion` y 403 si falta.
2. Ajustes y horarios (semana y días especiales).
3. Cafés con pentágono y vista previa; tolva ("Poner en tolva").
4. Productos: lista ordenable, talles, fotos (achicadas en el navegador, subidas a R2).
5. Al guardar: limpiar la caché del sitio y mostrar "Guardado. Ya se ve en el sitio.".

**Plan 4 · Lanzamiento**

1. Dominios (`falco.cafe` y `falcocafe.com.ar`), DNS y redirecciones.
2. Deploy de las dos apps, entornos de preview y producción, migraciones en D1.
3. Backup semanal de D1 a R2 (Cron Trigger, últimas 8 copias).
4. Carga del contenido real y pruebas en un Android y un iPhone reales.
5. Checklist "Terminado cuando" de `SCOPE.md`.
