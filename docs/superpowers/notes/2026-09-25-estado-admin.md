# Estado del admin al 2026-09-25

Rama: `feat/plan-3-admin` (sale de `main` después del merge del sitio). Todo pusheado.
Plan: `docs/superpowers/plans/2026-09-25-plan-3-admin.md`.

## Cómo levantarlo en tu computadora

Una vez:

```bash
npm install
npm run db:reset --workspace @falco/site     # la tabla nueva de tolva lo necesita
cp apps/admin/.dev.vars.example apps/admin/.dev.vars
```

Cada vez, en dos terminales:

```bash
npm run dev --workspace @falco/site     # http://localhost:4321
npm run dev --workspace @falco/admin    # http://localhost:4322
```

El admin usa **la misma base local que el sitio** (`persistState` en `apps/admin/astro.config.mjs`
apunta a `apps/site/.wrangler/state`): lo que se guarda en el admin se ve en el sitio recargando.

En tu computadora no hay login: entrás con el mail de `ADMIN_DEV_EMAIL` (`.dev.vars`), y eso **sólo
funciona desde localhost**. En Cloudflare, el login lo hace Access (Plan 4).

## Qué está hecho (Tasks 1 a 7 del plan)

| Pantalla      | Qué hace                                                                                                                                                                 | Verificado                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| **Base**      | `hopper_coffees`: la tolva tiene su propio catálogo. Escrituras en `packages/db/src/mutations.ts`, probadas contra SQLite real                                           | 97 tests en `@falco/db`                                            |
| **Acceso**    | `apps/admin/src/auth.ts` valida el token de Access en cada pedido (firma, `aud`, `iss`, vencimiento, mail). Sin token: 403                                               | 10 tests, incluido uno que se rompe si se saca el chequeo de `aud` |
| **Inicio**    | Qué dice el sitio ahora (mismo cálculo que la home), el café en tolva y accesos con resumen                                                                              | a mano, 390 y 1440                                                 |
| **Tolva**     | Lista, poner en tolva con un toque, ficha con el pentágono en vivo, crear, editar, borrar con confirmación. El que está en tolva no se borra y lo explica                | 12 chequeos en el navegador, contra la home del sitio              |
| **Horarios**  | La semana (abierto/cerrado, tramos, "Copiar el lunes de martes a viernes") y feriados (alta, edición, borrado). Errores antes de guardar con la misma regla del servidor | 15 chequeos, contra el sitio                                       |
| **Ajustes**   | WhatsApp, carta e Instagram, con links de prueba                                                                                                                         | 6 chequeos, contra `/carta` del sitio                              |
| **Productos** | **Pantalla provisoria**: dice que viene pronto                                                                                                                           | —                                                                  |

## Qué falta (Tasks 8 a 11)

8. Productos: lista por estante y orden (arrastrar y subir/bajar).
9. Productos: ficha (precios, visible, nuevo, consultar stock, opciones de molienda, y el origen y el
   pentágono de los cafés que se venden, dentro de la ficha).
10. Fotos: achicar en el navegador, subir a R2, servirlas desde el sitio (`/fotos/...`).
11. Revisión de código independiente, QA en celular real y PR.

Las escrituras de productos (`createProduct`, `reorderShelf`, etc.) todavía no existen: van con sus
pantallas.

## Decisiones que tomé sin preguntar (revisar)

- **Cerrar a la medianoche se carga como 00:00.** El selector de hora del celular no tiene 24:00; el
  admin lo guarda como 24:00. Está dicho en la pantalla.
- **"Copiar el lunes de martes a viernes"** en vez de "a toda la semana": sábado y domingo suelen
  ser distintos.
- **La ficha de un café de tolva pide Nombre y País** (obligatorios en la base). El resto es opcional.
- **Un día especial se puede cambiar de fecha** desde su ficha; el viejo se borra en la misma
  transacción.

## Para revisar con el dueño

- **El WhatsApp del seed es `543424667646`, sin el 9.** Para que `wa.me` abra el chat de un celular
  argentino suele hacer falta `549` + característica + número (sin el 15). Si los pedidos no
  llegan, es esto. La ayuda del campo en Ajustes ya lo explica.
- Los cafés de tolva Sidama y Cerrado del seed son **de ejemplo**.

## Lo que aprendimos y no hay que volver a aprender

**Correr `astro check` con el servidor de desarrollo prendido lo rompe.** El chequeo regenera la
caché de Vite (`node_modules/.vite`) y el servidor que estaba corriendo queda apuntando a archivos
que ya no existen: todas las páginas dan 500 con "The file does not exist at ... deps_ssr". No es
un error del código: se apaga el servidor (`npx astro dev stop`), se corre el chequeo y se vuelve
a prender.

**Un campo `required` frena el envío en el navegador**, antes de llegar al servidor: en las pruebas,
"no se mandó" se verifica con `validity.valid`, no buscando el mensaje de error del servidor.

**Los tipos de Cloudflare pisan `before()` y `append()` del DOM** (ya estaba anotado para el sitio):
en los scripts del admin también se usa `insertBefore`/`appendChild`.
