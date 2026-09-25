# Levantar falco-web en otra computadora (Windows)

Escrito el 2026-09-24 para mudar el trabajo de la MacBook a la PC principal.

**Nada del proyecto vive solo en una máquina.** Todo el código está en
`git@github.com:josuevtl1337/falco-web.git`, y lo único que no viaja por git se
regenera con dos comandos. No hay secretos, ni `.env`, ni cuenta de Cloudflare:
la base corre entera en local (`database_id: "local"` en `wrangler.jsonc`).

## Lo que hace falta tener instalado

| | |
| --- | --- |
| Node | **22.12 o mayor** (está declarado en `engines` del `package.json` raíz) |
| git | para clonar |
| Claude Code | se instala en la PC y se abre la carpeta del proyecto |

## Los pasos

```bash
git clone git@github.com:josuevtl1337/falco-web.git
cd falco-web
git checkout feat/plan-2-site
npm install
```

El remoto está por SSH. Si la PC no tiene la llave cargada en GitHub, clonar por
HTTPS y listo:

```bash
git clone https://github.com/josuevtl1337/falco-web.git
```

Después, la base local:

```bash
cd apps/site
npm run db:reset
```

Eso borra la base local, aplica las migraciones y carga el seed. **Hay que
correrlo la primera vez**: `.wrangler/` está en `.gitignore`, así que la base no
viaja por git.

Y a trabajar:

```bash
npm run dev          # desde apps/site
```

## Verificar que quedó bien

Desde la raíz del repo:

```bash
npx vitest run
```

Tienen que dar **250 tests en verde** (al 2026-09-24). Y:

```bash
npm run typecheck --workspace @falco/site
```

Tiene que decir **0 errores**.

Si las dos cosas pasan, el entorno está completo.

## Lo que NO viaja por git, y cómo vuelve

`.gitignore` deja afuera:

- `node_modules/` → vuelve con `npm install`
- `.wrangler/` (la base local de D1) → vuelve con `npm run db:reset`
- `worker-configuration.d.ts` (los tipos de Cloudflare) → lo generan solos
  `npm run dev` y `npm run typecheck`, que corren `wrangler types` antes
- `.astro/` → se regenera sola

## Trampas de Windows que ya nos pasaron en este proyecto

Están todas **arregladas en el repo**; van acá para que, si vuelven a aparecer,
se reconozcan rápido en vez de investigarlas de nuevo.

**`[postcss] ENOENT ... @fontsource-variable/bricolage-grotesque`**
Un `@import` de un paquete sin ruta de archivo funciona en macOS y falla en
Windows. Los imports de fuentes en `global.css` tienen que apuntar a un archivo
concreto (`/wght.css`), no al paquete pelado.

**`Cannot find module 'cloudflare:workers'` en el typecheck**
Falta correr `wrangler types`. El script `typecheck` ya lo hace solo; si alguien
corre `astro check` a mano, falla.

**La base no tiene los cambios de una migración editada**
Wrangler lleva la cuenta de las migraciones **por nombre de archivo**: editar una
que ya se aplicó no la vuelve a correr. Para eso está `npm run db:reset`, que
borra y rehace.

**`better-sqlite3` no compila**
Es la única dependencia nativa (la usan los tests de `packages/db`). npm suele
bajar un binario ya compilado; si en cambio intenta compilarlo, hacen falta las
Build Tools de Visual Studio. No está probado en Windows todavía: si falla,
`npm install` lo dice claro y se resuelve instalando esas herramientas.

## El CSS que no cambia al recargar

No es de Windows, pasa en cualquier lado y nos costó un rato dos veces:

1. **Caché de Vite**: `npx astro dev stop`, borrar `node_modules/.vite` y
   `.astro`, y levantar de nuevo.
2. **Caché del navegador**: después de reiniciar el servidor, el navegador puede
   seguir sirviendo la hoja vieja. Recargar con una query distinta (`?v=2`) o
   con recarga forzada.

## Dónde está el contexto del proyecto

La conversación con Claude no viaja entre máquinas, pero lo que importa está
escrito en el repo:

- `HANDOFF.md` — qué es Falco, el diseño, las decisiones
- `SCOPE.md` — qué entra y qué no
- `docs/superpowers/specs/2026-09-18-falco-web-design.md` — la spec
- `docs/superpowers/plans/2026-09-20-plan-2-sitio.md` — el plan en curso
- `docs/superpowers/notes/2026-09-21-como-revisar.md` — cómo revisar y las
  trampas verificadas
- `design/persona/wireframes.html` — la lámina contra la que se mide todo

Para mirar la lámina con los estilos calculados (que es como se midieron todos
los valores del sitio), hay que servirla por HTTP: abrirla como archivo local no
deja inspeccionarla.

```bash
cd design
python3 -m http.server 8899
# http://localhost:8899/persona/wireframes.html
```
