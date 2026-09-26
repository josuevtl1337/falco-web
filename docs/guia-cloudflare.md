# Guía para publicar Falco

Lo que hay que hacer **una sola vez** en Cloudflare, en GitHub y en Google para que
`falcocafe.com.ar` y `admin.falcocafe.com.ar` queden en el aire. Desde ahí, cada merge a `main`
se publica solo.

Está en orden: cada paso usa algo del anterior. Tiempo total: una hora de trabajo más la espera del
paso 2, que puede tardar varias horas.

Vas a ir juntando **6 datos**. Anotalos a medida que aparecen (en un lugar privado: el token del paso 6 es
una contraseña):

| Dato                           | Sale del paso | Va en GitHub como               |
| ------------------------------ | ------------- | ------------------------------- |
| Account ID                     | 1             | secreto `CLOUDFLARE_ACCOUNT_ID` |
| Id de la base D1               | 4             | variable `D1_DATABASE_ID`       |
| Nombre del equipo de Access    | 5             | variable `ACCESS_TEAM`          |
| AUD de la aplicación de Access | 5             | variable `ACCESS_AUD`           |
| API token                      | 6             | secreto `CLOUDFLARE_API_TOKEN`  |
| Token de Web Analytics         | 9             | variable `CF_BEACON_TOKEN`      |

---

## 1. Cuenta de Cloudflare y el dominio

1. Creá la cuenta en <https://dash.cloudflare.com/sign-up> con el mail de Falco (o el tuyo). El plan
   **Free** alcanza para todo.
2. **Add a domain** → `falcocafe.com.ar` → plan **Free**.
3. Cloudflare copia los registros DNS que ya tenga el dominio. Revisalos:
   - Si hay registros de **mail** (MX, TXT con `spf`), dejalos: son los de tu correo.
   - Si hay registros **A, AAAA o CNAME** para `falcocafe.com.ar`, `www` o `admin` (suelen ser
     de una página "en construcción" del registrador), **borralos**. Cloudflare los crea solo al
     publicar, y si ya existen el primer deploy falla.
4. Al final te muestra **dos nameservers** (algo como `ana.ns.cloudflare.com`). Dejá esa pestaña
   abierta.
5. **Account ID**: en la página de inicio del dominio, columna derecha, abajo de todo, "Account ID".
   Copialo.

## 2. Los nameservers en NIC Argentina

1. Entrá a <https://nic.ar> con tu clave fiscal → **Mis dominios** → `falcocafe.com.ar` →
   **Delegar**.
2. Borrá las delegaciones que haya y cargá los dos nameservers de Cloudflare del paso 1.
3. Guardá. NIC.ar tarda entre minutos y unas horas. Cloudflare te manda un mail cuando el
   dominio queda **Active**. Podés seguir con los pasos 3 a 7 mientras tanto; el 8 necesita que
   esté activo.

## 3. R2: donde viven las fotos y los backups

1. En el menú: **R2 Object Storage**. La primera vez pide activarlo y una tarjeta. Con el uso de
   Falco no se paga: el plan gratis incluye 10 GB.
2. **Create bucket** → nombre `falco-photos` → Create. (Las fotos de los productos.)
3. **Create bucket** → nombre `falco-backups` → Create. (Las copias de la base.)
4. Entrá a `falco-backups` → **Settings** → **Object lifecycle rules** → **Add rule**:
   - Nombre: `borrar-viejos`
   - Prefijo: `d1/`
   - Acción: **Delete objects** después de **60 días**.

   Así quedan siempre los últimos 2 meses de backups, sin acumular.

## 4. D1: la base de datos

1. En el menú: **Storage & Databases** → **D1 SQL Database** → **Create**.
2. Nombre: `falco` (exactamente así). Ubicación: automática.
3. En la página de la base, arriba, está el **Database ID** (una tira larga con guiones).
   Copialo.

La base arranca vacía. Las tablas y el contenido de partida se cargan en el paso 11.

## 5. El login del admin (Cloudflare Access)

1. En el menú: **Zero Trust**. La primera vez pide un **nombre de equipo**: poné `falco` (si está
   tomado, `falcocafe` o parecido) y elegí el plan **Free** (hasta 50 personas, sin cargo).
   Ese nombre es el **`ACCESS_TEAM`**. Si no te acordás: **Settings** → **Custom Pages** →
   "Team domain" dice `<nombre>.cloudflareaccess.com`; va sólo `<nombre>`.
2. **Access** → **Applications** → **Add an application** → **Self-hosted**.
   - Application name: `Admin Falco`
   - Session duration: `1 month` (para no pedir el código a cada rato en el celular)
   - Public hostname: subdominio `admin`, dominio `falcocafe.com.ar`
3. **Policy**: nombre `Nosotros`, acción **Allow**, regla **Include** → **Emails** → tu mail y el
   de tu pareja.
4. Login methods: **One-time PIN** (viene activado). Es un código que llega al mail: no hay
   contraseñas que recordar.
5. Guardá. En la lista de aplicaciones, abrí `Admin Falco` → pestaña **Overview** →
   **Application Audience (AUD) Tag**. Copialo: es el **`ACCESS_AUD`**.

> El admin revisa ese login **otra vez** en cada pedido (`apps/admin/src/auth.ts`). Si alguien
> llegara al admin sin pasar por Access, o con el login de otra aplicación, recibe "No tenés
> acceso a este panel".

## 6. El token para que GitHub publique

1. Arriba a la derecha: tu perfil → **My Profile** → **API Tokens** → **Create Token**.
2. Plantilla **Edit Cloudflare Workers** → **Use template**.
3. En **Permissions**, agregá (con **+ Add more**):
   - Account · **D1** · Edit
   - Zone · **DNS** · Edit
4. **Account Resources**: tu cuenta. **Zone Resources**: Specific zone → `falcocafe.com.ar`.
5. **Continue to summary** → **Create Token**. Copialo **ahora**: no se vuelve a mostrar.

Es la llave para publicar y tocar la base. Sólo va en GitHub como secreto, nunca en el código ni
en un chat.

## 7. Los datos en GitHub

En <https://github.com/josuevtl1337/falco-web> → **Settings** → **Secrets and variables** →
**Actions**.

Pestaña **Secrets** → **New repository secret**, dos veces:

- `CLOUDFLARE_API_TOKEN` = el token del paso 6
- `CLOUDFLARE_ACCOUNT_ID` = el Account ID del paso 1

Pestaña **Variables** → **New repository variable**, tres veces (la cuarta, en el paso 9):

- `D1_DATABASE_ID` = el id del paso 4
- `ACCESS_TEAM` = el nombre del equipo del paso 5 (sólo el nombre, sin `.cloudflareaccess.com`)
- `ACCESS_AUD` = el AUD del paso 5

## 8. La primera publicación

Necesita que el dominio esté **Active** (paso 2).

1. Mergeá a `main` el PR del Plan 4. Eso dispara el workflow **Publicar** (pestaña **Actions**).
   Tarda unos 3 minutos.
2. Si termina en verde: <https://falcocafe.com.ar> ya responde, pero se va a ver vacía o con error hasta el paso
   11 porque la base está vacía. Es normal.

Si falla, abrí el paso en rojo: el mensaje suele decir qué dato falta. Los más comunes:

- **"Falta la variable D1_DATABASE_ID"**: paso 7.
- **"Authentication error"**: el token del paso 6 está mal copiado o le falta un permiso.
- **"Hostname already has externally managed DNS records"**: quedó un registro A o CNAME del paso
  1.3. Borralo en **DNS** → **Records** y corré **Publicar** otra vez (**Run workflow**).

## 9. Web Analytics

1. En el menú: **Analytics & Logs** → **Web Analytics** → **Add a site** → `falcocafe.com.ar`.
2. Si ofrece **automatic setup**, elegí la opción **manual / JS snippet** (el sitio ya trae el
   script; con las dos se cuenta cada visita dos veces).
3. Del snippet que muestra, copiá sólo el valor de `"token"`.
4. En GitHub (paso 7), variable nueva: `CF_BEACON_TOKEN` = ese valor.
5. **Actions** → **Publicar** → **Run workflow**. Desde ahí se cuentan las visitas. Sin cookies ni
   cartel de consentimiento.

## 10. Backup semanal

Ya queda andando solo: todos los lunes a las 6 de la mañana, el workflow **Backup** guarda la base
entera en `falco-backups/d1/falco-AAAA-MM-DD.sql`.

Probalo una vez a mano: **Actions** → **Backup** → **Run workflow**. Cuando termine, el archivo
aparece en R2 → `falco-backups` → `d1/`.

Además, D1 guarda solo el historial de los últimos días (**Time Travel**): si algo se borra por
error, se puede volver la base al minuto anterior desde la consola de D1, sin usar el backup.

## 11. Carga inicial

Una sola vez, después del paso 8:

1. **Actions** → **Carga inicial** → **Run workflow** → escribí `cargar` → **Run workflow**.
2. Crea las tablas si faltan y carga el contenido de partida (el mismo que venías viendo en tu
   computadora). Si la base ya tiene productos, **no hace nada**: nunca pisa datos reales.
3. Abrí <https://falcocafe.com.ar>: tiene que verse la home.

Después, en <https://admin.falcocafe.com.ar> (te pide el mail y te manda un código):

- **Ajustes**: revisá el WhatsApp. El de partida es `543424667646`, **sin el 9**: para que
  `wa.me` abra el chat de un celular argentino suele hacer falta `549` + característica + número,
  sin el 15. Probalo con el link de prueba de la misma pantalla. Revisá también el link de la
  carta: la carpeta de Drive de partida está vacía.
- **Tolva**: borrá los cafés de ejemplo que no tengas (Sidama y Cerrado son inventados) y cargá el
  real.
- **Productos**: poné precios y fotos reales. "Producto de prueba" (oculto) se puede borrar.
- **Horarios**: confirmá la semana y cargá los feriados que vengan.

## 12. Google

### Search Console (que Google encuentre el sitio)

1. <https://search.google.com/search-console> → **Agregar propiedad** → **Dominio** →
   `falcocafe.com.ar`.
2. Te da un registro **TXT**. En Cloudflare: **DNS** → **Records** → **Add record** → Type `TXT`,
   Name `@`, Content el texto de Google → Save. (A veces Google ofrece hacerlo solo con
   Cloudflare: también sirve.)
3. Volvé a Search Console → **Verificar**.
4. **Sitemaps** → escribí `sitemap.xml` → **Enviar**. Ahí está la home y cada producto visible, y
   se actualiza solo cuando cargás o escondés uno.

Google tarda de días a semanas en mostrar el sitio en las búsquedas; Search Console avisa si
encuentra algún problema.

### Perfil de empresa (Maps)

Es lo que aparece al buscar "Falco Santo Tomé" en Google o en Maps. En
<https://business.google.com>, buscá Falco:

- Si ya aparece como tuyo: editá **Sitio web** = `https://falcocafe.com.ar` y **Menú** =
  `https://falcocafe.com.ar/carta` (siempre lleva a la carta que tengas cargada en Ajustes).
- Si aparece pero no es tuyo: **Reclamar esta empresa**. Google verifica con un video del local,
  una llamada o una postal.
- Si no aparece: **Agregar empresa**, con la dirección Iriondo 2153, Santo Tomé.

Los horarios de ese perfil se cargan allá aparte: Google no los toma del sitio. El sitio sí le
pasa los suyos (dirección, horarios, feriados, Instagram y carta) en un formato que Google lee,
pero para Maps manda lo que cargues en el perfil.

---

## Después del lanzamiento

- **Publicar un cambio**: merge a `main`. Nada más. Si los tests fallan, no se publica y lo que
  estaba sigue igual.
- **Cambios en la estructura de la base**: a partir de acá, **nunca** se edita
  `packages/db/migrations/0001_init.sql`. Cada cambio va en un archivo nuevo (`0002_...sql`) y
  **Publicar** lo aplica antes de subir el código. Editar el 0001 no llega a producción: D1
  anota qué migraciones ya corrió y no las repite.
- **Volver a un backup**: bajá el `.sql` de R2 y pedile ayuda a quien mantenga el código: se
  restaura con `wrangler d1 execute falco --remote --file <archivo>` sobre una base nueva, no
  encima de la actual.
