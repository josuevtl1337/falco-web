# Plan 4 — El lanzamiento

**Goal:** Que `falcocafe.com.ar` y `admin.falcocafe.com.ar` queden publicados en Cloudflare, que
cada merge a `main` se publique solo, que la base tenga backup semanal y que Google encuentre y
entienda el sitio.

**Rama:** `feat/plan-4-launch` (sale de `feat/plan-3-admin`; mergear el PR del admin primero).
**Guía para el dueño:** `docs/guia-cloudflare.md` (todo lo que se hace en las cuentas).

## Decisiones del dueño (2026-09-26)

1. Dominio `falcocafe.com.ar` (ya comprado, NIC.ar). El admin en `admin.falcocafe.com.ar`.
2. Deploy con **GitHub Actions**, automático en cada push a `main`.
3. **Backup semanal** de D1 a R2, además de Time Travel.
4. SEO con **Google Search Console**. Métricas con **Cloudflare Web Analytics** (sin cookies, sin
   cartel de consentimiento), no Google Analytics.
5. Login del admin: **Cloudflare Access** con los mails del dueño y su pareja, código por mail.

## Tasks

- [x] **Configuración de producción.** `session: false` e `imageService: "passthrough"` en los dos
      `astro.config.mjs`: sin ellos el adaptador pedía un KV de sesiones y el binding de Cloudflare
      Images, que no se usan. Verificado con `wrangler deploy --dry-run`: el sitio sólo tiene `DB`,
      `PHOTOS` y `ASSETS`; el admin, además, sus variables.
- [x] **Dominios.** `routes` con `custom_domain` en los dos `wrangler.jsonc`; `workers_dev` y
      `preview_urls` apagados (un `*.workers.dev` sería el sitio duplicado para Google y otra puerta al
      admin). `www` → dominio sin www con 301 (`apexRedirect` en `apps/site/src/middleware.ts`).
- [x] **Workflows** en `.github/workflows/`:
  - `ci.yml`: tests y typecheck en cada PR y en cada push fuera de `main`.
  - `deploy.yml` ("Publicar"): tests → id real de D1 en los `wrangler.jsonc` → migraciones
    nuevas → sitio → admin. Nunca dos a la vez.
  - `backup.yml`: lunes 06:00 (Argentina) `wrangler d1 export` a `falco-backups/d1/`. La
    retención (60 días) es una regla de ciclo de vida de R2.
  - `carga-inicial.yml`: manual, con confirmación; migra y corre el seed **sólo si no hay
    productos**.
- [x] **SEO.** `apps/site/src/seo.ts` (probado en `test/seo.test.ts`):
  - `Base.astro`: canonical al dominio, Open Graph (`public/og.png` o la foto del producto),
    `noindex` en `/pedido` y el 404.
  - JSON-LD `CafeOrCoffeeShop` en la home: dirección, carta, Instagram y horarios **de la base**,
    feriados próximos incluidos.
  - `/sitemap.xml` dinámico (home + productos visibles) y `public/robots.txt`.
  - El admin responde siempre con `X-Robots-Tag: noindex, nofollow`.
- [x] **Web Analytics.** El beacon se carga sólo si `CF_BEACON_TOKEN` tiene valor (vacío en
      desarrollo; en producción lo pasa "Publicar" desde la variable de GitHub).
- [x] **Guía** `docs/guia-cloudflare.md`.
- [ ] **El dueño sigue la guía** (pasos 1 a 12).
- [ ] **QA en producción** después de la carga inicial: home, pedido hasta WhatsApp, ficha de un
      producto, `/carta`, `/sitemap.xml`, `www` → apex, login del admin con los dos mails y con uno
      que no está (tiene que rebotar), subir una foto desde el celular, backup manual.

## Reglas desde el primer deploy

- **La base de producción tiene datos reales.** Nunca más `db:reset` contra ella, y nunca se edita
  `0001_init.sql`: cada cambio de estructura va en una migración nueva (`0002_...sql`), que
  "Publicar" aplica antes de subir el código. El código nuevo tiene que andar también con la base
  vieja durante esos segundos (agregar columnas con default, no renombrar de una).
- **Los datos de las cuentas no van en el repo.** Ids y tokens viven en GitHub (secretos y
  variables); en el repo, `database_id` sigue siendo `"local"` y `ACCESS_*` vacíos.
