# Final branch review — Plan 1 "Fundaciones"

- **Branch:** `feat/plan-1-foundations` (`dbc75e0..a03e554`, 15 commits, 34 files, +3476, additions only)
- **Reviewer scope:** whole branch, cross-package. Deliberately looking for what a task-scoped review cannot see.
- **Reproduced locally:** `npm test` → **102 passing** (28 db + 56 domain + 18 ui). `npm run typecheck` → **clean** on all three workspaces. Node v22.14.0.
- **Extra evidence:** 47 ad-hoc probes run against the real packages and the real migration (better-sqlite3, in-memory), in the session scratchpad. Every claim below that says "proven" was executed, not reasoned.

**Verdict: 2 blocking findings.** Both are things that are cheap to fix now and expensive-to-irreversible later. Nothing on this branch is broken, crashing, or insecure. The load-bearing logic is, with the exceptions named in B2 and NB4, correct.

---

## Clean bill — what I verified is RIGHT

These are the parts most likely to be wrong in a three-agent split, and they are not.

1. **The time boundary between `packages/domain` and `packages/db` is exact.** `packages/db/src/schemas.ts:3` (`TIME`) and `packages/domain/src/time.ts:40` (`HHMM`) are two independently written regexes. I brute-forced all 3000 strings `00:00`–`29:99` plus `8:00`, `20:00:00`, `0800`, `" 08:00"`, `"08:00 "`, `24:01`, `1440`, `""`: **zero disagreements**. Both accept `HH:MM` with `24:00` as the only 24-hour form and reject everything else.
2. **The `24:00` ⇄ 1440 ⇄ `"00:00"` round trip is coherent end to end.** `parseHHMM("24:00")=1440`; the only value in the whole accepted set that does not round-trip through `formatHHMM(parseHHMM(x))` is `24:00 → 00:00`, which is the intended display. `getOpenStatus` at Sat 23:30 with `18:00–24:00` returns `Abierto ahora · cierra 00:00`; at Sun 00:30 the same shift is correctly over.
3. **`addDays` and `toArgentina` agree across 400 consecutive days** (year boundary included), both for date and weekday. Argentina has had no DST since 2009, and the code never touches the device clock — `toArgentina` goes through `Intl.DateTimeFormat` with `timeZone: America/Argentina/Buenos_Aires` and `hourCycle: h23`. This satisfies the spec's sharpest correctness requirement (§6.1: "no con la del dispositivo").
4. **Every row in `packages/db/seed/seed.sql` validates against the zod schema that guards it** — coffees, products, product_options, the 7 `business_hours` rows as `weekHoursSchema`, and the 4 settings keys as `settingsSchema`. I wired the seeded DB through the schemas row by row; all pass.
5. **The WhatsApp message matches spec §6.2 character for character**, including the blank lines, the `•`, the ` · ` separators, `talle {label}`, `Total estimado: $ 41.000`, `Lo retiraría en el local cuando me confirmen.`, the optional `Comentario: ….` line and the closing `¿Me confirman si hay stock y desde qué hora lo puedo retirar?`. The no-name variant (`¡Buenas! Quiero hacer este pedido (F-7K2Q):`) matches spec §6.2's fallback. `buildWhatsAppUrl` produces `https://wa.me/{digits}?text={encoded}` as specified.
6. **The order code alphabet is right.** `23456789ABCDEFGHJKMNPQRSTUVWXYZ` — 31 characters, excluding `0 1 I L O`, the five genuinely ambiguous glyphs. `F-7K2Q` (the spec's example) is inside the alphabet.
7. **Expiry boundaries are exact and inclusive-at-the-limit**: draft 72 h from `updatedAt`, sent 48 h from `sentAt`, `>=` at the boundary (`packages/domain/src/order.ts:118-122`). Storage key is `falco.order.v1` as specified.
8. **`order-storage.ts` degrades correctly in hostile browsers.** Every `localStorage` access is wrapped; a blocked storage, a `null` storage, corrupt JSON, a non-order object and an expired order all resolve to `null` *and* clear the key. This is better than the spec asked for.
9. **`packages/domain` has zero dependencies and no DOM types** (`tsconfig.base.json` has `lib: ["ES2022"]` only); `order-storage.ts:5` declares its own `KeyValueStorage` port instead of importing `Storage`. That is the right call for a package that must run in a Worker, in a React island and in Vitest.
10. **Design tokens match their sources exactly.** All 7 palette hexes, all 5 fixed angles including `-1.6deg`, and the three OFL families match the plan's Global Constraints; `--ease-persona` matches `--snap: cubic-bezier(0.2, 1.2, 0.4, 1)` in `design/persona/wireframes.html:22`, confirming the coordinator's leading-zero ruling was the correct side to move. The Spanish token names (`piedra`, `hueso`, `ceniza`, `brasa`, …) are **not** a language-convention violation: they are the proper names printed in `design/Sistema.dc.html`, and spec §3 says the system-sheet tokens "pasan tal cual".
11. **Foreign keys are not fragile.** `packages/db/test/migrations.test.ts:14` sets `foreign_keys = ON`, but I proved better-sqlite3 13 already reports `foreign_keys: 1` by default, and D1 enforces FKs by default too — so the test mirrors production rather than inventing a guarantee. `products.coffee_id REFERENCES coffees(id)` with no `ON DELETE` correctly blocks deleting a coffee a product uses (half of spec §7's rule; see NB3 for the other half).
12. **Commit hygiene is clean.** All 15 subjects are conventional (`feat`/`fix`/`chore`/`style` with `domain`/`db`/`ui` scopes), all authored as `jv_tokyo <josue.vitali@bonoxs.com>`, and a case-insensitive scan of all 15 messages for `claude|anthropic|co-authored|generated with|copilot|assistant|🤖` returns **nothing**. No secrets in the diff (the only `token` matches are the literal word "tokens" in filenames). No stray files: all 34 are in the plan's file manifest. `.gitignore` correctly covers `.dev.vars`, `.env*`, `.wrangler/`, `.astro/` and `.superpowers/`.

---

## BLOCKING

### B1 — `packages/db/migrations/0001_init.sql`: the schema's integrity guards are largely decorative, and SQLite will not let you repair them in place after the first deploy

This is one finding, not four, because the *reason* it is blocking is shared: **SQLite cannot `ALTER` a `CHECK` constraint or a column `DEFAULT`.** Fixing `0001_init.sql` today costs four lines. Fixing it after the migration has been applied to preview or production costs a full twelve-step table-rebuild migration (`PRAGMA legacy_alter_table`, new table, copy, drop, rename, re-create indexes) on the project's only durable store. The branch's entire purpose is to be the layer nobody has to revisit.

**(a) SQLite type affinity means the "integer" business rules are not enforced at all.** `0001_init.sql:33` is `price_ars INTEGER NOT NULL CHECK (price_ars >= 0)`. Proven against the real migration:

| written | stored | `typeof()` |
| --- | --- | --- |
| `price_ars = 1600.5` | `1600.5` | `real` |
| `price_ars = 'muchos'` | `'muchos'` | `text` |
| `acidity = 3.5` | `3.5` | `real` |
| `altitude_masl = 1750.7` | `1750.7` | `real` |
| `sort_order = 1.5` | `1.5` | `real` |
| `is_new = '1'` | `'1'` | `text` |

`'muchos'` survives `CHECK (price_ars >= 0)` because in SQLite's type ordering text sorts above every number. `acidity = 3.5` survives `CHECK (acidity BETWEEN 1 AND 5)`. So the spec's "Los precios se guardan en pesos enteros" (§5) and "pentágono 1-5" are enforced **only** by zod, i.e. only on the admin's happy path — not by the seed file, not by `wrangler d1 execute`, not by a later migration, not by any Plan 3 code path that forgets the schema. And `is_new = '1'` is the nastiest: `Boolean('1')` is `true`, so it looks fine, while `row.is_new === 1` is `false`, so a strict comparison in Plan 2 silently hides the "Nuevo" badge.
*Fix:* add `AND typeof(price_ars) = 'integer'` to the existing CHECKs on `price_ars`, `altitude_masl`, `sort_order`, the five pentagon columns and the three 0/1 flags.

**(b) No format guard on `opens_at` / `closes_at` / `special_days.date`, and the domain layer throws rather than degrading.** `0001_init.sql:59-61` and `:66-71` constrain only nullability and the `is_closed` pairing. Proven: `UPDATE business_hours SET opens_at = '8:00'` succeeds; `INSERT INTO special_days (date, is_closed) VALUES ('25/12/2026', 1)` succeeds; `INSERT … ('not-a-date', 1)` succeeds. Then `getOpenStatus` with that row **throws** `Error: Invalid time: 8:00` from `packages/domain/src/time.ts:44`, reached via `open-status.ts:58`. In Plan 2 that call is server-side in Astro SSR on the home hero, so one malformed row is a **500 on the site's landing page** — the single worst failure mode this codebase can produce, for the cheapest possible cause. The coordinator parked this as a Task 2 minor ("zod in T8 guards writes"); with whole-branch eyes the guard is one layer deep, on the writer only, and the reader has no fallback.
*Fix (either or both):* `CHECK (opens_at IS NULL OR opens_at GLOB '[0-2][0-9]:[0-5][0-9]')` on all four time columns and `CHECK (date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]')` on `special_days.date`; and/or make `getOpenStatus` treat an unparseable day as closed instead of throwing.

**(c) `created_at` / `updated_at` speak a different time dialect from every other timestamp in the project, and JS mis-parses it by the UTC offset.** `0001_init.sql:18-19`, `:39-40`, `:77` use `DEFAULT CURRENT_TIMESTAMP`. Proven: the seeded row stores `'2026-09-20 03:33:35'` — UTC, space-separated, **no timezone marker**. `new Date('2026-09-20 03:33:35').toISOString()` on this machine returns `2026-09-20T06:33:35.000Z`: a **3-hour error**, because JS reads a space-separated datetime as *local* time. Meanwhile all of `packages/domain` speaks ISO-8601-with-Z (`order.ts:29` `now.toISOString()`, `sentAt`, `updatedAt`). Nothing in either package converts between the two dialects, and no test pins the format. Two concrete consequences for Plan 3: "editado hace X" will be off by the viewer's offset, and Safari has historically returned `Invalid Date` for that shape outright. This also quietly contradicts the Global Constraint "todas las horas se interpretan en America/Argentina/Buenos_Aires" — these are the only timestamps in the system with no stated zone.
*Fix:* `DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))`. A column DEFAULT is the other thing SQLite cannot `ALTER`.

**(d) Empty strings satisfy every `NOT NULL TEXT` column.** Proven: `INSERT INTO products (slug, kind, shelf, name, detail, price_ars) VALUES ('', 'gear', 'kits', '', '', 0)` is accepted — an unroutable product with an empty `/tienda/` slug. zod's `requiredText` catches it on the admin path only.
*Fix:* `CHECK (length(trim(slug)) > 0)` on `slug`, `name`, `detail`, `country`, `roaster`, `label`, `settings.value`.

---

### B2 — `packages/domain/src/order.ts:22-26, :45, :84`: "2 unidades por producto" is implemented as 2 units **per variant**, so one product can reach 40 units

`sameLine` (`:22-26`) keys a line on `productId` **and** `optionId`, and both caps are applied to that key: `addItem` refuses at `existing.qty >= ORDER_LIMITS.maxUnitsPerLine` (`:45`) and `setQty` clamps to it (`:84`). So the "2 units" cap is per size, not per product.

Proven: 20 `addItem` calls for `productId: 3` with `optionId` 1…20, then `setQty(…, 2)` on each → **40 units of a single product** in a legal order that passes every existing test. With the seed's four real T-shirt sizes (`seed.sql:11`: S, M, L, XL) the reachable number is **8 shirts of one product**, through normal UI clicks, with no warning.

This contradicts the binding text in three places, all of which say *producto*, not *variante*:
- spec §6.2: "**hasta 2 unidades por producto**, para que nadie pida más de lo que suele haber en stock"
- `SCOPE.md:97-98`: "Máximo 20 productos distintos y 2 unidades de cada uno (para no pedir más de lo que suele haber en stock)"
- plan Global Constraints line 18: "máximo **20 productos distintos** y **2 unidades por producto**"

The stated *reason* for the limit — don't let anyone order more than the shop usually has on the shelf — is exactly what 8 shirts defeats. A per-task review could not catch this: Task 4's brief talks about lines, and every Task 4 test is written in terms of lines, so the implementation and its tests agree with each other and both drift from the spec together. That is the archetypal per-task blind spot.

I am flagging this as blocking **as a decision, not necessarily as a code change.** Per-variant caps are a defensible product choice. But it must be resolved deliberately before this becomes the foundation two apps are built on, because Plan 2's stepper UI will encode whichever answer this layer gives. Two clean options:
- **Enforce per product:** in `addItem`/`setQty`, sum `qty` across every line sharing `productId` and cap that sum at `maxUnitsPerLine`. Add a test named for the variant case.
- **Amend the wording:** change the spec, `SCOPE.md` and the plan to say "2 unidades por talle", and add a `maxUnitsPerProduct` constant if a product-level cap is still wanted. The spec is the binding authority and the owner hand-edits it, so this is their call — but leaving the divergence undocumented is not an option.

Either way, also note that `unitCount` (`order.ts:124-126`) is the only aggregate exported, and no test pins the maximum reachable units of one product.

---

## NON-BLOCKING — worth fixing now

Ordered by how much trouble they will cause.

### NB1 — `packages/db` ships no row types, which is a spec-listed deliverable of this package

Spec §3's repo map says `db/ # esquema, migraciones de D1, tipos y validaciones (zod)`, and `SCOPE.md:60` repeats it. What `packages/db/src/index.ts` actually exports is `schemas.ts` + `slug.ts`: six **input** types (`CoffeeInput`, `ProductInput`, …), all camelCase and post-transform. There is no type describing what a `SELECT` returns — snake_case columns, `0|1` integers where the app wants booleans, `null` where the app wants `undefined`, `price_ars` as a number, `created_at` as the string dialect from B1(c).

Consequence, and it is the specific incoherence this whole layer exists to prevent: `apps/site` and `apps/admin` are built in different plans by different agents, both read the same six tables, and with nothing shared they will each invent their own row type and their own snake→camel mapper. Add `CoffeeRow`, `ProductRow`, `ProductOptionRow`, `BusinessHoursRow`, `SpecialDayRow`, `SettingsRow` plus the row→domain mappers now, while there is exactly one author.

### NB2 — `WeekHours` (record) vs `weekHoursSchema` (array): the adapter between the two packages exists nowhere

`packages/domain/src/open-status.ts:8` wants `WeekHours = Readonly<Record<number, DayHours>>`. `packages/db/src/schemas.ts:71` produces `Array<{weekday, isClosed, opensAt, closesAt}>`, which is also the natural shape of `SELECT * FROM business_hours ORDER BY weekday`. Nothing converts. I had to hand-write

```ts
Object.fromEntries(rows.map(d => [d.weekday, {isClosed: d.isClosed, opensAt: d.opensAt, closesAt: d.closesAt}]))
```

in the probe just to exercise the seeded week through `getOpenStatus` — and once I did, it produced the right answers (`Cerrado · abre 15:00` Sunday 10:00, `Abierto ahora · cierra 20:00` Sunday 16:00 and Monday 09:00). This is a five-line function that both `apps/site` and `apps/admin` need; it will otherwise be written twice, differently. Ship `toWeekHours(rows)` in `@falco/db` (or accept either shape in `getOpenStatus`). Note also that `DayHours` uses `isClosed/opensAt/closesAt` while the DB columns are `is_closed/opens_at/closes_at` — same concept, two spellings, no shared mapper.

### NB3 — Nothing protects `settings.hopper_coffee_id` from pointing at a deleted coffee

Spec §7 is explicit: "No se puede borrar un café que está en la tolva ni uno que usa un producto." The second half is enforced by the FK on `products.coffee_id` (proven: the delete throws). The first half **cannot** be enforced by this schema at all, because the hopper id is a `TEXT` value in a key/value table and SQLite cannot put a foreign key on it. Proven: delete the products referencing coffee 1, then `DELETE FROM coffees WHERE id = 1` succeeds and `settings.hopper_coffee_id` still reads `'1'`.

Two things follow, and neither is owned by anyone yet: **(1)** Plan 3 must guard this in application code before every coffee delete; **(2)** Plan 2's home page must render a *dangling* hopper id without crashing, because the window between a delete and a cache purge is real. Consider a `BEFORE DELETE ON coffees` trigger that raises when the id is in the hopper — that is enforceable at the storage layer, it survives every code path, and unlike a CHECK a trigger **can** be added in a later migration.

### NB4 — `buildOrderMessage` drops a `talle` the person chose, silently, and still bills for it

`packages/domain/src/message.ts:28-36`: `lineText` resolves the option via `product.options?.find(o => o.id === line.optionId)` and, when it misses, simply omits the ` · talle X` segment. Proven with a stored order for `{productId: 3, optionId: 99}` against a catalog whose product only lists option 31:

```
• 1 × Remera Falco · Algodón
Total estimado: $ 16.000
```

The size is gone; the shirt is still charged. This is reachable through the normal admin flow — deleting a `product_options` row (which nothing cascades to the browser) or a stale localStorage order after a size is retired. The parked ruling covers the *product*-missing case (`pruneUnavailable` before building the message, which I also confirmed works: an unknown `productId: 777` drops its line and the remaining total stays correct), but the *option*-missing case is different in kind: pruning would delete a line the person actually wants, and the right behaviour is to make them re-pick the size. Either make `lineText` throw / return a sentinel when `optionId` is set but unresolvable, or export an `unresolvedOptions(order, catalog)` helper so Plan 2 can force a re-pick. As it stands, the shop receives an order for a T-shirt with no size and has to ask — which is precisely the friction the fixed message wording exists to avoid.

### NB5 — `buildOrderMessage` happily builds a complete message for an empty order

Proven: `buildOrderMessage(createOrder("F-7K2Q", T0), catalog)` returns

```
¡Buenas! Quiero hacer este pedido (F-7K2Q):


Total estimado: $ 0
Lo retiraría en el local cuando me confirmen.

¿Me confirman si hay stock y desde qué hora lo puedo retirar?
```

— note the doubled blank line and the `$ 0`. Nothing in `packages/domain` refuses this, and no test covers it. Combine with NB4 (every line dropped because the catalog went stale) and it is reachable without the person doing anything odd. Guard in `buildOrderMessage`, or export `canSend(order, catalog)` for Plan 2's button state.

### NB6 — `isOrder` accepts forged localStorage that defeats the unit cap, and accepts any string as the order code

`packages/domain/src/order-storage.ts:18-27` validates each line independently and `:39` caps `items.length`, but nothing rejects **duplicate** `{productId, optionId}` pairs. Proven: a hand-written `falco.order.v1` with two `{productId: 1, qty: 2}` lines passes `isOrder`, and `loadOrder` returns it — **4 units of one product**, past the cap the model enforces on every other path. Also:
- `:33` accepts any `string` as `code`, including `""` (message reads `pedido ():`) and `"hola mundo"`. `ORDER_CODE_PATTERN` is exported two files away and unused here.
- `:13-14` `isIsoDate` is `!Number.isNaN(Date.parse(v))`, so `updatedAt: "Sep 19 2026"` passes — proven.
- `sentAt` in the future is accepted, and such an order never expires (proven with `sentAt: "2030-01-01"`).

Impact is small — the shop declines in the chat — but `loadOrder` is the only trust boundary around user-writable storage, and tightening it is four lines: dedupe the lines, test `code` against `ORDER_CODE_PATTERN`, clamp `sentAt` to `<= now`.

### NB7 — `markSent` on an already-sent order resets the 48 h window (deferred Task 4 minor, now with a concrete Plan 2 trigger)

`order.ts:103-105` unconditionally overwrites `sentAt`. Proven: sent at T0, `markSent` again at T0+47 h → `sentAt` becomes T0+47 h, and the order is still not expired at T0+90 h. Plan 2's "Esperando confirmación" screen has a **"volver al chat"** button (spec §6.2, and the `order_resume_chat` metric event). If that button re-uses the send path, every tap renews the 48 h clock and the order never ages out. Make `markSent` a no-op when `sentAt` is already set, so the rule cannot be broken from the UI.

### NB8 — `packages/ui` names three font families that nothing in the repo serves

`tokens.ts:25-29` / `tokens.css:19-21` reference `"Bricolage Grotesque"`, `"Instrument Sans"` and `"Martian Mono"`. Spec §6.3 requires them to be **self-hosted** ("no desde Google Fonts"). There is no `@font-face`, no `.woff2`, and no `fonts/` directory anywhere on the branch — so today every token silently resolves to its fallback (`Arial Narrow`, `system-ui`, `ui-monospace`). That is a legitimate Plan 1 boundary, but it means `@falco/ui` currently promises a typographic system it cannot deliver, and the LCP budget (≥90 Lighthouse, LCP < 2.5 s) depends on how those files are shipped. Name the owner now — see CF3.

### NB9 — `business_hours`, `special_days` and `product_options` have no `updated_at` / `updated_by`

Proven by `PRAGMA table_info` on the real migration: `coffees`, `products` and `settings` have both; the other three have neither. `SCOPE.md:80` says "**Todas** las tablas editables guardan updated_at y updated_by (mail del admin)", and all three are edited from the admin (the Horarios screen, product options). The migration followed spec §5's SQL, which omits them there — so this is a spec-vs-scope contradiction the implementer resolved in favour of the binding artifact, which is the right call. But the consequence is that there is no audit trail on **horarios**, the one table whose edits get disputed ("¿quién puso que cerrábamos a las 18?"). Unlike B1, `ALTER TABLE … ADD COLUMN` is cheap in SQLite, so this can wait — but it needs to be written down or it will never happen.

### NB10 — `updated_at` is never bumped on `UPDATE`; there are no triggers

Proven: `UPDATE coffees SET name = 'Huila 2'` leaves `updated_at` byte-identical, and `SELECT name FROM sqlite_master WHERE type='trigger'` returns `[]`. Every admin write must remember to set `updated_at` and `updated_by` by hand, and nothing catches the one that forgets. Since spec §7 leans on these for "Guardado. Ya se ve en el sitio." and for cache invalidation, add `AFTER UPDATE` triggers (addable in a later migration, so not urgent) or pin the discipline with a test in `packages/db`.

### NB11 — The reopening label is ambiguous past six days, and gives up at fourteen

`open-status.ts:84`: `const when = offset === 1 ? "mañana" : \`el ${WEEKDAY_NAMES[weekday]}\``. Proven:

| situation | label | `nextOpen.date` |
| --- | --- | --- |
| closed 7 days, today Saturday | `Cerrado · abre el sábado 08:00` | `2026-09-26` |
| closed 10 days (holiday block) | `Cerrado · abre el martes 08:00` | `2026-09-29` |
| closed 20 days | `Cerrado` | `null` |

Row 1 reads as "opens today" on a Saturday. Row 2 points at a Tuesday ten days out with nothing to distinguish it from *this* Tuesday. Spec §6.1 only requires "el próximo día que abre", so this is compliant-but-misleading, and `nextOpen.date` is exported so Plan 2 can render a date — but no test covers any offset beyond 2, which is why nobody noticed. Either include the date in the label when `offset >= 7`, or document that Plan 2 must.

### NB12 — Test seams nobody owns

The per-task suites are genuinely good (56 domain tests pin real behaviour with exact expected strings, not shape assertions). The gaps are all *between* tasks:

- **No test crosses the db↔domain boundary.** Nothing checks that `timeSchema` and `parseHHMM` agree, that a seeded `business_hours` set feeds `getOpenStatus`, or that a seeded product feeds `buildOrderMessage`. I wrote all three in the scratchpad and they pass — which is exactly why they should live in the repo: they are the invariants most likely to silently break when Plan 2 edits one side. The cheapest home is a small `packages/db/test/domain-seam.test.ts`.
- **`migrations.test.ts` covers 5 of the 12 CHECK constraints.** Untested: `price_ars >= 0`, the three 0/1 flags, `weekday BETWEEN 0 AND 6`, `altitude_masl`, the `special_days` pairing, and the `settings` table entirely. All the holes in B1 are in the untested set.
- **Nothing pins the fixed wording "no está reservado".** Spec §6.2 and `SCOPE.md:116` name it a fixed phrase; it is correctly absent from the message template, so it belongs to Plan 2's UI copy — but there is no test anywhere, in any package, that will notice if it never gets written. `message.test.ts:101-105` only pins the *forbidden* words.
- **`ORDER_CODE_PATTERN` (`order-code.ts:3`) hard-codes a second copy of `ALPHABET` (`:1`).** No test asserts that every character of the alphabet matches the pattern, so the two can drift; the 200-iteration random test would only catch it probabilistically. Derive the regex from the constant.
- **The ui drift test is one-directional** (deferred Task 9 minor): `tokens.test.ts` walks TS → CSS, so an orphaned custom property with no TS token goes undetected. It also does not assert `color-scheme: dark`.
- **`formatArs` has no guard** and no test for the inputs it should never see: proven `$ -5.000`, `$ NaN`, `$ Infinity`. Unreachable today (`price_ars >= 0`) — but see B1(a), where a text price is reachable.

### NB13 — `seed.sql` cannot exercise four spec behaviours

Proven counts over the seeded DB: `special_days: 0`, `products WHERE is_visible = 0: 0`, `products WHERE ask_stock = 1: 0`, `product_options WHERE is_available = 0: 0`. So the dev dataset cannot demonstrate the holiday branch of "Abierto ahora" (the thing `SCOPE.md:158` names as a launch criterion), the `pruneUnavailable` path, the "Consultar stock" badge, or a sold-out size. Plan 2 and Plan 3 will both hand-craft fixtures. Four rows in `seed.sql` — one special day, one hidden product, one `ask_stock` product, one unavailable option — make the seed a real test bed.

### NB14 — `settingsSchema` is the wrong shape for its two consumers

`schemas.ts:151-162` is a single object requiring all four settings at once, with `hopperCoffeeId` nullable but `menuUrl` and `instagramUrl` required-and-https. But the table is key/value, the hopper lives on the admin's **Tolva** screen while the other three live on **Ajustes** (spec §7), and `SCOPE.md:144-149` lists the WhatsApp number and the menu PDF link as **content that does not exist yet**. So at launch this schema cannot validate the real state of the settings table, and neither admin screen can submit the object it demands. Plan 3 will either work around it or partially bypass it. Split it into per-key schemas (or make the object `.partial()`-friendly) and decide deliberately which keys may be absent.

### NB15 — Smaller items, verified but low-impact

- `getOpenStatus` with `closes_at < opens_at` (accepted by the DB, rejected by zod) reports `Cerrado · abre 20:00` at noon — wrong but harmless; B1(b) closes the door.
- A shift crossing midnight (`20:00`–`02:00`) is not representable. **Both** layers refuse it consistently (zod rejects; `getOpenStatus` treats it as not-yet-open), so this is coherent, not a bug — but it is a real capability limit worth knowing before someone promises Falco a Friday late shift.
- `slugify("☕")`, `slugify("русский")` and `slugify("   ")` all return `""`, which `productInputSchema` then rejects with "Usá solo minúsculas, números y guiones." — technically correct, confusing to read. `slugify` also has no uniqueness handling, so a second "Huila · Colombia" hits the `UNIQUE` constraint as a raw SQLite error; Plan 3 needs `-2` suffixing.
- `packages/ui` has no `src/index.ts` (deferred Task 9 minor); `exports["."]` points straight at `tokens.ts`. Fine today, inconsistent with the other two packages.
- `better-sqlite3` is a native module in `packages/db`'s devDependencies — CI needs a toolchain to compile it. Worth a line in the CI setup when it lands.
- **Pre-existing, not this branch:** `design/persona/__pycache__/build.cpython-39.pyc` is tracked (added in `288f951` on main) and `__pycache__/` is not in `.gitignore`. Mentioned only so it is not mistaken for branch debris.

---

## CARRY INTO PLAN 2 / PLAN 3

Concrete, so this section is actionable when those plans get written.

**Plan 2 (public site)**

- **CF1 — Call `pruneUnavailable` on load, before anything else** (the coordinator's parked Task 6 ruling, confirmed by probe). Order of operations on every page load: `loadOrder` → `pruneUnavailable` against the visible catalogue → `saveOrder` → only then `orderTotal` / `buildOrderMessage`. Skip it and `buildOrderMessage` silently omits lines whose product is gone while the person still believes they ordered them. Also tell the person what was removed — spec §6.2 requires the removal, not the silence.
- **CF2 — Do not call `markSent` from "volver al chat"** (NB7). It renews the 48 h expiry every tap. Route the resume button to `buildWhatsAppUrl` only, and fire `order_resume_chat`.
- **CF3 — The three fonts are unowned** (NB8). Plan 2 must self-host Bricolage Grotesque, Instrument Sans and Martian Mono as `.woff2` subsets with `@font-face` + `font-display: swap`, inside the LCP < 2.5 s budget. Until then `@falco/ui` renders its fallbacks.
- **CF4 — `@falco/ui` is tokens only.** It has no spacing scale, no radii, no type scale, no durations (only two easing curves), no breakpoints, no z-index ladder, no semantic aliases (`--bg`, `--text`, `--border`), and no `44px` minimum-touch-target token even though spec §6.3 makes it a hard requirement. Decide where those live *before* writing the first component, or they will be hard-coded per component.
- **CF5 — The 8th colour.** `design/persona/wireframes.html:17` defines `--board: #18191b` and uses it as a background; it is not in the palette, and `packages/ui/src/tokens.test.ts:31-41` **actively locks it out** ("son exactamente los 7 colores del sistema"). Plan 2 will either add an ad-hoc hex or extend the palette and change that test. Decide which, on purpose. Related: the wireframes use unprefixed names (`--carbon`, `--display`, `--snap`) and the tokens use `--color-carbon`, `--font-display`, `--ease-persona`, so wireframe CSS cannot be pasted in as-is — write the 13-variable mapping down once.
- **CF6 — "no está reservado" has no home yet** (NB12). It is a fixed phrase in spec §6.2 and correctly absent from the WhatsApp message. It must appear in the order UI and the "Esperando confirmación" screen, and something must test for it.
- **CF7 — JSON-LD opening hours need a formatter nobody wrote.** Spec §6.4 wants `CafeOrCoffeeShop` with hours from the database, i.e. `DayHours[] → "Mo-Fr 08:00-20:00"` in schema.org `openingHours`. Note `24:00` needs special handling there. Natural home: `@falco/domain` next to `getOpenStatus`.
- **CF8 — Recalculating every minute is supported.** `getOpenStatus(instant, week, specials)` takes the instant explicitly, so the per-minute client tick in spec §6.1 works by re-calling it with a fresh `new Date()`. Ship the week and the specials to the client, never the computed status.
- **CF9 — Label the reopening day with a date past six days** (NB11), using the `nextOpen.date` the status already returns.
- **CF10 — Guard against a dangling hopper id** (NB3). `settings.hopper_coffee_id` can point at a deleted coffee; the home page must degrade, not throw.
- **CF11 — Nothing in `packages/domain` touches metrics.** `order_send` needs `items`, `units`, `total_estimate`, `code` — `unitCount` and `orderTotal` give you three of four. Spec §8: **never** send `customerName` or `note`.
- **CF12 — Neither `setQty` nor `addItem` tells the UI it clamped** (deferred Task 4 minor). `addItem` returns `unit_limit`/`line_limit`, but `setQty` returns a silently-clamped order. The stepper must compare before/after to show "máximo 2 por producto". This interacts directly with B2 — whatever cap you land on, the UI has to explain it.
- **CF13 — `apps/site` needs `"@falco/domain": "*"` and `"@falco/ui": "*"`** in its package.json; no cross-package dependency is declared anywhere yet. Both packages export raw `.ts` from `exports["."]`, which Vite handles for workspace-linked sources but which will need a `noExternal`/`ssr.noExternal` entry for the Workers build.

**Plan 3 (admin)**

- **CF14 — Ship `packages/db` row types and mappers first** (NB1), before either app writes a query.
- **CF15 — `imageKey` is deliberately outside `productInputSchema`** (deferred Task 8 minor). Confirm the R2 upload flow sets `products.image_key` on its own path, and that deleting a product deletes its R2 object (spec §7: "la foto anterior se borra") — nothing cascades to R2.
- **CF16 — Enforce "no se puede borrar un café en tolva" in code, and consider the trigger** (NB3).
- **CF17 — Every write must set `updated_at` and `updated_by`** (NB9, NB10). No trigger does it, `business_hours`/`special_days`/`product_options` do not even have the columns, and `updated_by` must come from the Access JWT (spec §7).
- **CF18 — Restructure `settingsSchema` per key** (NB14) so Tolva and Ajustes can each save independently and so a not-yet-configured key is representable.
- **CF19 — `slugify` needs uniqueness handling** (NB15) so the admin shows "ya existe un producto con ese link" instead of a raw `UNIQUE constraint failed`.
- **CF20 — No test feeds an invalid value to the `kind`/`shelf` enums** (deferred Task 8 minor); the admin's select is the only thing keeping them honest.
- **CF21 — No wrangler configuration exists anywhere.** Spec §5 says migrations are applied with `wrangler d1 migrations`, which needs a config with the D1 binding and `migrations_dir` pointing at `packages/db/migrations`. `packages/db` also has no `migrate`/`seed` script. Whoever creates `apps/*` owns this, and the preview-then-production migration discipline in spec §9 depends on it.
- **CF22 — Order codes are not unique and nothing makes them so.** 31⁴ = 923,521 codes, fine for spec §8's "contar a mano en WhatsApp". Phase 2 persists orders with their code — at that point add a `UNIQUE` column and a retry loop.
- **CF23 — Phase 2's delete-on-pickup flow has no foundation yet**, by design (spec §2 and §6.2 both say the site cannot learn what happened in the chat in phase 1). Noted so it is not mistaken for an oversight.

---

## Appendix — how the evidence was produced

Three probe files under the session scratchpad (`…/scratchpad/probe/`), run with the repo's own Vitest against the real package sources and the real `0001_init.sql` + `seed.sql` via better-sqlite3: `seams.probe.ts` (33 tests — regex equivalence brute force, migration-vs-zod asymmetries, FK behaviour, seed-vs-schema, seeded week through `getOpenStatus`, message holes, storage validator holes, slug seam, midnight/week boundaries, order limits), `more.probe.ts` (8 tests — lookahead beyond 7 days, `CURRENT_TIMESTAMP` format and timezone, `updated_at` bumping, editable-table column audit, query plans), `types.probe.ts` (6 tests — SQLite type affinity against every "integer" and 0/1 rule). Nothing in the repository was modified.
