# Estado del Plan 2 — el sitio público

> **Este archivo es el lugar donde mirar qué falta, sin preguntarle a nadie.**
> Se actualiza al cerrar cada tarea. Si está desactualizado, el commit más reciente manda.

Última actualización: **2026-09-21** · rama `feat/plan-2-site` · 21 commits sobre `main`
**187 tests en verde** (76 db + 79 domain + 20 ui + 12 site) · typecheck limpio en los 4 workspaces

---

## 1. Qué falta para terminar el Plan 2

El detalle completo de cada tarea, con su código, está en
[`docs/superpowers/plans/2026-09-20-plan-2-sitio.md`](../plans/2026-09-20-plan-2-sitio.md).

| # | Tarea | Estado |
| --- | --- | --- |
| 1 | La app Astro sobre Workers | ✅ terminada |
| 2 | Tipos de fila y consultas de solo lectura | ✅ terminada |
| 3 | Base visual: tokens, tipografías y layout | ✅ terminada |
| 4 | "Abierto ahora" | ✅ terminada — ⚠️ sin review independiente |
| 5 | La home | ✅ terminada — ⚠️ sin review independiente |
| — | *(extra)* El día pasa a tener varios tramos | ✅ terminada |
| 6 | **La tienda y el detalle de cada producto** | ⬜ **pendiente — es la que sigue** |
| 7 | **El pedido** | ⬜ pendiente |
| 8 | Dónde estamos, la carta y el 404 | ⬜ pendiente |
| 9 | Caché en el borde | ⬜ pendiente |
| — | Review final de toda la rama | ⬜ pendiente |
| — | Merge a `main` | ⬜ pendiente |

**Por qué 6 antes que 7:** el pedido necesita productos que se puedan tocar. La 6 construye las
fichas y el detalle; la 7 les agrega el botón "Sumar al pedido" encima.

---

## 2. Deuda conocida (no son bugs, son cosas que decidimos postergar)

### Deuda de proceso

- **Las tareas 4 y 5 no tuvieron review independiente.** La 4 se revisó después de que dos despachos
  se colgaran; la 5 la implementó quien coordina. **La review final de rama tiene que cubrirlas.**

### Defectos menores postergados

- El test `"nunca usa la zona horaria del dispositivo"` mira el código fuente del componente: detecta
  una llamada literal a `getHours(`, pero no una indirecta. La prueba real es correr la suite en otra
  zona horaria, que sí se hace.
- El repo no tiene `.prettierrc` ni el plugin de Prettier para `.astro`, así que esos archivos se
  formatean a mano.
- El `overrides` de `@emnapi/*` en el `package.json` de la raíz está pineado exacto (`1.11.3`): no
  flota con `npm update` y hay que subirlo a mano. Existe porque npm deja esos paquetes como
  directorios vacíos y eso rompe `astro check`. Solo afecta herramientas de desarrollo, nunca el
  Worker que se despliega.
- El `getWeekHours` de la capa de consultas se prueba por forma, no por valores.

### Restricciones que atan a las tareas que faltan

- La regla global de **44 px** usa `:where()`, que tiene **especificidad cero**: un
  `button { min-height: 32px }` dentro del `<style>` de un componente le gana en silencio. Ningún
  componente puede bajar de `var(--touch-min)`.
- Contrastes medidos: hueso sobre carbón 11,10:1 · hueso sobre piedra 9,80:1 · brasa sobre carbón
  8,92:1 · hueso sobre tostado 4,87:1 (pasa AA, raspando). **Nunca** ceniza sobre tostado (2,29:1)
  ni tostado como texto sobre carbón (2,28:1).
- Una clase usada por más de una página, o por una isla de React, **va en `global.css`**: Astro
  encapsula los estilos de componente y no aplicaría afuera.
- El sitio va **100 % SSR**, sin ninguna ruta prerenderizada: el import `cloudflare:workers` rompe
  el build si alguna se prerenderiza. Hay un test que lo bloquea.

---

## 3. Decisiones tomadas durante la ejecución

| Decisión | Por qué |
| --- | --- |
| **TypeScript bajó de 7.0.2 a 6.0.3** | `astro check` rechaza la 7: el compilador nativo todavía no expone la API que necesita el language server. La alternativa dejaba **sin chequear el frontmatter de los `.astro`**, que es donde vive casi todo el código del sitio y todo el admin que viene. Reversible cuando la soporten. |
| **`Astro.locals.runtime` no se usa** | Fue eliminado en el adaptador v14. Los bindings se leen con `import { env } from "cloudflare:workers"`. |
| **El `main` del `wrangler.jsonc` apunta al entrypoint del adaptador** | `dist/_worker.js/index.js` rompe `astro dev` al resolver la configuración y no es lo que emite la v14. |
| **`typecheck` genera los tipos antes de chequear** | `worker-configuration.d.ts` lo genera `wrangler types` y está en `.gitignore`. Sin esto, el typecheck falla en un clon nuevo o en CI. |
| **El cartel "Abierto ahora" se recalcula al montar** | El HTML se cachea 60 s en el borde, así que el estado del servidor puede llegar atrasado. Sin eso, el cartel podía mentir casi dos minutos. Los efectos de React corren **después** del pintado, así que esto no afecta la primera pintura. |
| **El día tiene N tramos, y `isClosed` desapareció** | El local corta al mediodía. `isClosed: true` con un horario cargado era un estado contradecible; una lista vacía no se puede contradecir. |
| **El día y sus tramos van en tablas separadas** | Un día especial **cerrado** tiene que existir para pisar al horario semanal, y no tiene ningún tramo que lo represente. |
| **Cada producto tiene dos precios** | Falco cobra distinto con tarjeta que en efectivo o transferencia. `price_ars` se partió en `price_card_ars` y `price_cash_ars`, las dos obligatorias y sin alias; `orderTotal` devuelve `{ cash, card }` y el mensaje muestra los dos, con el de efectivo primero. Mostrar uno solo te deja parecer más caro de lo que sos, o sorprender a alguien en la caja. |
| **Las remeras quedaron para más adelante** | Se fueron del seed junto con los talles, pero el **mecanismo de opciones se quedó entero**: es el que usa el café para grano y molido. `kind` conserva `'apparel'`, así que volver no toca el esquema. |
| **El seed se parece a la realidad** | El catálogo real se muestra entero: nada oculto, nada con "Consultar stock" inventado, las dos moliendas disponibles. Los casos raros que las pruebas necesitan viven en un **borrador oculto** (`producto-de-prueba`), que no se ve en el sitio. |
| **El café se vende en grano y molido** | La opción se elige dentro del producto. El mensaje de WhatsApp imprime la etiqueta tal cual, que se escribe entera en el admin. |

---

## 4. Contenido del dueño

| Qué | Estado |
| --- | --- |
| Logo en SVG | ✅ `design/brand/logo-falco.svg` (+ variante para fondos claros) |
| Cara del murciélago y favicon | ✅ `design/brand/falco-face.svg` y `favicon.svg` |
| Número de WhatsApp | ✅ `543424667646` — WhatsApp Business, línea fija, **sin el 9** |
| Horarios reales y feriados | ✅ 13 tramos semanales + 20 feriados de 2026 y 2027 |
| Link de la carta | ✅ cargado — ⚠️ **la carpeta de Drive está vacía**: falta subir el PDF |
| Foto del molino E65S | ❌ descartada por el dueño (2026-09-20) |
| Precios de accesorios | ✅ los 6 productos reales, con precio de tarjeta y de efectivo |
| Precio del cuarto de café | ⬜ **falta**: el Huila sigue con precio de prueba ($ 13.000 / $ 12.000) |
| Fotos de productos y textos | ⬜ los carga el dueño **desde el admin**, o sea recién en el Plan 3 |
| Dominio | ⬜ **`falcocafe.com.ar`** por NIC Argentina (ARS 8.500/año), pendiente de la clave fiscal. Ya está puesto en `astro.config.mjs` y en la spec |

---

## 5. Después del Plan 2

- **Plan 3 — el admin.** Hasta que exista, el sitio muestra los productos de prueba del seed: el
  catálogo real entra recién acá.
- **Plan 4 — lanzamiento.** Animaciones, Umami, SEO y JSON-LD, el favicon enchufado, medición de
  Lighthouse, el dominio y el despliegue.

Lo que cada uno hereda está detallado en
[`2026-09-20-arrastre-del-plan-1.md`](2026-09-20-arrastre-del-plan-1.md).

---

## 6. Dónde mirar cada cosa

| Pregunta | Archivo |
| --- | --- |
| Qué falta y en qué estado está | **este archivo** |
| El detalle de cada tarea, con su código | `docs/superpowers/plans/2026-09-20-plan-2-sitio.md` |
| Qué pidió el dueño y por qué | `docs/superpowers/specs/2026-09-18-falco-web-design.md` |
| El alcance de la fase 1 | `SCOPE.md` |
| Lo que el Plan 1 dejó para los siguientes | `docs/superpowers/notes/2026-09-20-arrastre-del-plan-1.md` |
| La evidencia de la review final del Plan 1 | `docs/superpowers/notes/2026-09-20-review-final-plan-1.md` |
| Cómo correr los tests y qué mirar al revisar | `docs/superpowers/notes/2026-09-21-como-revisar.md` |

> El detalle crudo de la ejecución (cada ruling, cada hallazgo de cada review) vive en
> `.superpowers/sdd/<plan>/progress.md`, que **está fuera del repo a propósito**: es andamio de
> trabajo y se borra al cerrar el plan. Todo lo que tiene que sobrevivir se copia acá.
