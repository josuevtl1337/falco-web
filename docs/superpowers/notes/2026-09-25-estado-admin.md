# Estado del admin al 2026-09-25 (al final del día)

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

## Qué está hecho: las Tasks 1 a 10 del plan, más la revisión

| Pantalla | Qué hace | Verificado |
| --- | --- | --- |
| **Base** | `hopper_coffees`: la tolva tiene su propio catálogo. Todas las escrituras en `packages/db/src/mutations.ts`, probadas contra SQLite real | 111 tests en `@falco/db` |
| **Acceso** | `apps/admin/src/auth.ts` valida el token de Access en cada pedido (firma, `aud`, `iss`, vencimiento, mail). Sin token: 403 | 10 tests, incluido uno que se rompe si se saca el chequeo de `aud` |
| **Inicio** | Qué dice el sitio ahora (mismo cálculo que la home), el café en tolva y accesos con resumen | a mano, 390 y 1440 |
| **Tolva** | Lista, poner en tolva con un toque, ficha con el pentágono en vivo, crear, editar, borrar con confirmación. El que está en tolva no se borra y lo explica | 12 chequeos en el navegador, contra la home del sitio |
| **Productos** | Lista por estante (con los ocultos), orden arrastrando o con flechas. Ficha: tipo, precios, visible, Nuevo, Consultar stock, moliendas y, si es café, su origen y pentágono. Foto: se achica en el navegador y va a R2 | 7 + 15 + 14 chequeos, contra el sitio |
| **Horarios** | La semana y los feriados, con errores antes de guardar | 15 chequeos, contra el sitio |
| **Ajustes** | WhatsApp, carta e Instagram, con links de prueba | 6 chequeos, contra `/carta` del sitio |

El sitio sigue pasando su QA: 31/31 del pedido y 12/12 de la navegación.

**Revisión de código independiente** (con foco en el acceso, las escrituras y las fotos): se
arreglaron todos los hallazgos salvo uno, que depende del Plan 4 (abajo). Lo más importante:
`saveProduct` ahora es todo o nada, y una foto cambiada desde dos pestañas a la vez ya no puede
hacer borrar la que está en uso.

## Qué falta

**Task 11 (cierre del Plan 3):** probar en un celular real (arrastrar productos con el dedo y subir
una foto desde la cámara), y abrir el PR.

**Para el Plan 4 (deploy):**

- Crear la aplicación de Cloudflare Access, con los mails de los dos, y completar `ACCESS_TEAM` y
  `ACCESS_AUD` en `apps/admin/wrangler.jsonc`.
- Crear la base D1 y el bucket R2 (`falco-photos`) de producción.
- **Si se activa la caché real del sitio:** hoy, al cambiar una foto, la vieja se borra al instante.
  Con caché, una página guardada hasta 60 segundos seguiría pidiendo la foto vieja y se vería rota.
  Al activar la caché hay que limpiarla desde el admin al guardar, o borrar la foto vieja más
  tarde.

## Decisiones que tomé sin preguntar (revisar)

- **Cerrar a la medianoche se carga como 00:00.** El selector de hora del celular no tiene 24:00; el
  admin lo guarda como 24:00. Está dicho en la pantalla.
- **"Copiar el lunes de martes a viernes"** en vez de "a toda la semana": sábado y domingo suelen
  ser distintos.
- **La ficha de un café de tolva pide Nombre y País** (obligatorios en la base). El resto es opcional.
- **Un día especial se puede cambiar de fecha** desde su ficha; el viejo se borra en la misma
  transacción.
- **El estante sale del tipo de producto**: un café va a Café; accesorio, kit o ropa, a Kits y
  accesorios. Así un café no puede terminar en el estante equivocado.
- **Editar un producto no cambia su dirección** (`/tienda/<slug>`) aunque cambie el nombre: es el link
  que alguien pudo haber compartido.
- **Las moliendas conservan su id al editarlas**: el pedido guardado de un cliente apunta a ese id.
- **El precio con tarjeta menor que el de efectivo es un aviso, no un error.**

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
en los scripts del admin también se usa `insertBefore`/`appendChild`. Con `HTMLSelectElement` pasa
lo mismo: se tipa como `HTMLElement & { value: string }`.

**El adaptador de Astro reserva el binding `IMAGES`** para Cloudflare Images y pisa, sin avisar,
cualquier binding con ese nombre. Por eso el bucket de fotos se llama `PHOTOS`.

**Arrastrar con `setPointerCapture` no sirve si la fila se mueve en la lista**: moverla la saca del
DOM un instante y el navegador suelta la captura. El arrastre escucha en el documento.

**En un `batch` de D1, `last_insert_rowid()` es el id de la sentencia anterior**: así un producto
nuevo toma el id de su origen recién creado sin salir de la transacción.
