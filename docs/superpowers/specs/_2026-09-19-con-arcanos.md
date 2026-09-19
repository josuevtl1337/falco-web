# Falco Web — Spec de diseño

- **Fecha:** 2026-09-18
- **Estado:** borrador para revisar
- **Diseño de referencia:** wireframes v7.6 "La Cueva × Persona" (`design/persona/wireframes.html`, publicado en https://claude.ai/artifact/99tGRDChQ1v8CYykgoB4HS)

---

## 1. Qué es y para quién

El sitio de Falco, café de especialidad en Iriondo 2153, Santo Tomé (Santa Fe). No es un e-commerce: presenta el lugar, muestra qué café está en la tolva y deja armar un pedido de café en grano, accesorios y remeras que **se confirma por WhatsApp** y se **retira en el local**.

**Público:** gente de Santo Tomé que recién está conociendo el café de especialidad. Todo dato técnico va con una explicación en lenguaje llano.

**Qué tiene que lograr:**

1. Que alguien que no conoce Falco entienda en un pantallazo qué es, dónde está y si está abierto ahora.
2. Que se pueda armar y mandar un pedido por WhatsApp sin dudar de que **todavía falta la confirmación de Falco**.
3. Que el equipo cambie el café en tolva, los productos y los horarios sin tocar código.

---

## 2. Alcance

### Fase 1 (lanzamiento)

- Sitio público: home (hero + tolva), tienda, detalle de producto, pedido por WhatsApp, dónde estamos, y página de error 404.
- `falco.cafe/carta`: redirige al PDF de Google Drive. El link se cambia desde el admin.
- Admin: tolva, catálogo de cafés, productos (con fotos y opciones), horarios y días especiales, ajustes.
- Métricas con Umami, sin cookies.
- Dominios, DNS y deploy en Cloudflare.

### Fase 2 (después del lanzamiento)

- Pedidos registrados con código y estado ("confirmado", "retirado") para medir la conversión real. Cuando Falco marca un pedido como retirado, el navegador de esa persona lo borra la próxima vez que entra al sitio. Requiere que el sitio escriba en la base, protegido con Cloudflare Turnstile.
- Carta propia en el sitio, en vez del PDF.
- Pantalla de carga con el murciélago (sin decidir).

### Fuera de alcance

- Pagos, pasarela, checkout o cuentas de clientes.
- Stock numérico en el sitio: el stock se confirma por WhatsApp.
- Envíos a domicilio: solo retiro en el local.
- Cualquier integración con `falco-app` (POS). El proyecto es independiente.

---

## 3. Arquitectura

```
                 falco.cafe                        admin.falco.cafe
                     │                                    │
          ┌──────────▼──────────┐          ┌──────────────▼──────────────┐
          │  apps/site (Astro)  │          │ Cloudflare Access (código   │
          │  Worker + assets    │          │ por mail, lista de mails)   │
          └───────┬───────┬─────┘          └──────────────┬──────────────┘
          lee     │       │ lee                           │
                  │       │                   ┌───────────▼───────────┐
             ┌────▼──┐ ┌──▼────┐              │ apps/admin (Astro)    │
             │  D1   │ │  R2   │◄─────────────┤ Worker + assets       │
             │(datos)│ │(fotos)│  escribe     └───────────────────────┘
             └───────┘ └───────┘
```

- **Dos apps en el mismo repo y dos Workers separados.** Si el admin se rompe, el sitio sigue andando.
- **El sitio solo lee.** No tiene ningún endpoint que escriba en D1 ni en R2.
- **El admin es el único que escribe**, y solo se llega a él pasando por Cloudflare Access.

### Repo

Repo nuevo e independiente: `falco-web`.

```
falco-web/
  apps/
    site/          # sitio público (Astro, SSR en Workers)
    admin/         # panel (Astro, SSR en Workers)
  packages/
    db/            # esquema, migraciones de D1, tipos y validaciones (zod)
    ui/            # tokens del sistema (colores, tipografías, ángulos) y componentes compartidos
  design/          # wireframes y exploraciones (ya existe)
  docs/            # specs y decisiones
```

### Stack

| Capa            | Elección                                        | Motivo                                                          |
| --------------- | ----------------------------------------------- | --------------------------------------------------------------- |
| Framework       | Astro, con islas de React donde hay interacción | HTML sin JS por defecto; el sitio es contenido con mucho diseño |
| Render          | SSR en Cloudflare Workers + caché en el borde   | Los cambios del admin se ven en segundos, sin rebuild           |
| Base            | Cloudflare D1                                   | Plan gratis amplio y sin pausas                                 |
| Fotos           | Cloudflare R2                                   | 10 GB gratis, sin costo de descarga                             |
| Login del admin | Cloudflare Access (código por mail)             | No hay contraseñas ni auth propia que mantener                  |
| Estilos         | CSS propio con custom properties                | Los tokens de la lámina de sistema v7 pasan tal cual            |
| Validación      | zod, compartido en `packages/db`                | La misma regla vale en el admin y en el sitio                   |
| Métricas        | Umami                                           | Eventos personalizados, sin cookies                             |
| Lenguaje        | TypeScript                                      |                                                                 |

**Convención de idioma** (la misma que usa `falco-app`): **los textos que ve el usuario van en español; todo lo demás en inglés**: código, tablas, columnas, rutas de API y nombres de archivo.

---

## 4. Dominios y rutas

| Dirección                  | Qué hace                                                                                              |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `falco.cafe`               | Sitio público _(verificar disponibilidad y precio antes de comprar)_                                  |
| `www.falco.cafe`           | Redirige a `falco.cafe`                                                                               |
| `falcocafe.com.ar`         | Redirige a `falco.cafe` (ARS 8.500 por año, NIC Argentina)                                            |
| `falco.cafe/carta`         | Redirige (302) al link del PDF guardado en los ajustes. Es la dirección que va en los QR de las mesas |
| `falco.cafe/tienda/[slug]` | Detalle de un producto con dirección propia, para compartir por Instagram                             |
| `admin.falco.cafe`         | Panel, detrás de Cloudflare Access                                                                    |

Si falco.cafe no está disponible, se decide otro dominio antes de empezar la fase 1, porque aparece en los QR y en Instagram.

**Redirección de `/carta`:** se usa 302 y no 301. Un 301 queda guardado en el navegador de quien escaneó el QR, y si después cambian el link de Drive, esa persona seguiría yendo al archivo viejo.

---

## 5. Modelo de datos (D1)

```sql
-- Cafés: catálogo. Un café puede estar en la tolva, en la tienda, o en los dos.
CREATE TABLE coffees (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL,              -- "Huila"
  farm            TEXT,                       -- "Finca La Esperanza"
  country         TEXT NOT NULL,
  variety         TEXT,                       -- "Caturra"
  process         TEXT,                       -- "Lavado"
  altitude_masl   INTEGER,
  tasting_notes   TEXT,                       -- "Durazno, panela, cítrico"
  description     TEXT,                       -- en lenguaje llano, para principiantes
  roaster         TEXT NOT NULL DEFAULT 'Puerto Blest',
  acidity         INTEGER NOT NULL CHECK (acidity BETWEEN 1 AND 5),
  sweetness       INTEGER NOT NULL CHECK (sweetness BETWEEN 1 AND 5),
  body            INTEGER NOT NULL CHECK (body BETWEEN 1 AND 5),
  aroma           INTEGER NOT NULL CHECK (aroma BETWEEN 1 AND 5),
  finish          INTEGER NOT NULL CHECK (finish BETWEEN 1 AND 5),
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      TEXT                        -- mail de quien editó (sale de Access)
);

-- Productos de la tienda.
CREATE TABLE products (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE,
  kind            TEXT NOT NULL CHECK (kind IN ('coffee','gear','kit','apparel')),
  shelf           TEXT NOT NULL CHECK (shelf IN ('coffee','kits')),  -- en qué fila del carrusel aparece
  coffee_id       INTEGER REFERENCES coffees(id),                    -- solo si kind = 'coffee'
  name            TEXT NOT NULL,
  detail          TEXT NOT NULL,              -- "250 g · en grano"
  description     TEXT,
  price_ars       INTEGER NOT NULL CHECK (price_ars >= 0),
  image_key       TEXT,                       -- clave del archivo en R2
  is_new          INTEGER NOT NULL DEFAULT 0,
  is_visible      INTEGER NOT NULL DEFAULT 1,
  ask_stock       INTEGER NOT NULL DEFAULT 0, -- muestra "Consultar stock"
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      TEXT
);

-- Opciones de un producto (por ahora, talles de remera).
CREATE TABLE product_options (
  id              INTEGER PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,              -- "M"
  is_available    INTEGER NOT NULL DEFAULT 1,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  UNIQUE (product_id, label)
);

-- Horario semanal. weekday: 0 = domingo … 6 = sábado.
CREATE TABLE business_hours (
  weekday         INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  is_closed       INTEGER NOT NULL DEFAULT 0,
  opens_at        TEXT,                       -- "08:00" (hora de Argentina)
  closes_at       TEXT                        -- "20:00"
);

-- Feriados y días con horario distinto. Tienen prioridad sobre business_hours.
CREATE TABLE special_days (
  date            TEXT PRIMARY KEY,           -- "2026-12-25"
  is_closed       INTEGER NOT NULL DEFAULT 0,
  opens_at        TEXT,
  closes_at       TEXT,
  note            TEXT                        -- "Navidad"
);

-- Ajustes sueltos.
CREATE TABLE settings (
  key             TEXT PRIMARY KEY,
  value           TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by      TEXT
);
-- Claves: hopper_coffee_id, whatsapp_number, menu_url, instagram_url.
```

**Reglas:**

- Solo hay **un café en la tolva**: es el `settings.hopper_coffee_id`. No hace falta una bandera por café que haya que mantener sincronizada.
- Los precios se guardan en **pesos enteros**.
- Todas las horas se interpretan en **America/Argentina/Buenos_Aires**.
- Las migraciones viven en `packages/db/migrations` y se aplican con `wrangler d1 migrations`.

---

## 6. Sitio público

### Secciones

Todo según los wireframes v7.6:

1. **Home:** calendario del día con entrada animada y "Abierto ahora", título, misión en caja de diálogo, tolva con placas, pentágono y foto del E65S. En el celular, la tarjeta chica con el pentágono sin etiquetas, el botón "Llevate un cuarto" y la hoja de detalle.
2. **Tienda:** dos carruseles (Café · Kits y accesorios). En escritorio, la ficha se da vuelta con el mouse y muestra el arcano. Tocarla abre el detalle.
3. **Detalle de producto:** panel lateral en escritorio y hoja que sube en el celular. También tiene su propia dirección, `/tienda/[slug]`.
4. **Pedido por WhatsApp** (ver 6.2).
5. **Dónde estamos:** calendario, horarios con la fila de hoy marcada, mapa, "Cómo llegar", "Ver la carta ↗" (lleva a `/carta`) y "Escribir por DM".
6. **404:** sencilla, en el tono del sitio.

### 6.1 "Abierto ahora"

- Se calcula con la **hora de Argentina**, no con la del dispositivo. Los wireframes usan la hora del dispositivo, y en producción eso es un error: alguien de afuera vería otro estado.
- Orden de prioridad: `special_days` de hoy, y si no hay, `business_hours` del día de la semana.
- Estados: **"Abierto ahora · cierra HH:MM"**, **"Cerrado · abre HH:MM"** o **"Cerrado · abre mañana HH:MM"**. Si mañana también está cerrado, dice el próximo día que abre.
- Se recalcula cada minuto en el navegador, con los horarios que vienen en la página.

### 6.2 Pedido

- **Dónde se guarda:** `localStorage`, con la clave `falco.order.v1`.

```ts
type Order = {
  items: { productId: number; optionId?: number; qty: number }[];
  customerName?: string;
  note?: string;
  code: string; // "F-7K2Q", se genera al crear el pedido
  updatedAt: string; // ISO; se actualiza en cada cambio, sirve para el vencimiento
  sentAt?: string; // ISO; si está, el pedido quedó en "Esperando confirmación"
};
```

- Al cargar la página, los productos que ya no son visibles se quitan del pedido, y los precios se toman siempre de la base. En el mensaje el total siempre dice **"Total estimado"**.
- Después de mandar el mensaje, el pedido pasa a **"Esperando confirmación"**. Desde ahí la persona puede volver al chat o empezar otro pedido, que vacía la lista.
- **Vencimiento** (el pedido vive en el navegador y no vence solo, así que se controla al cargar cada página):
  - Armado y sin enviar: se borra a los **3 días** sin cambios (`updatedAt`).
  - Enviado: se borra a las **48 horas** de `sentAt`.
  - "Empezar otro pedido": se borra en el momento.
  - En la fase 1 no hay forma de borrarlo cuando Falco confirma la entrega: el sitio no se entera de lo que pasa en el chat, y un link por WhatsApp no sirve porque WhatsApp suele abrirlo en su navegador interno, que no comparte datos con el de la persona.
- **Mensaje:**

```
¡Buenas! Soy {nombre} y quiero hacer este pedido ({código}):

• {qty} × {producto} · {detalle}[ · talle {opción}]
…

Total estimado: $ {total}
Lo retiraría en el local cuando me confirmen.
[Comentario: {comentario}.]

¿Me confirman si hay stock y desde qué hora lo puedo retirar?
```

- **Link:** `https://wa.me/{whatsapp_number}?text={mensaje codificado}`. Si no hay nombre, el saludo queda en "¡Buenas! Quiero hacer este pedido ({código}):".
- **Límites:** 20 productos distintos y **hasta 2 unidades por producto**, para que nadie pida más de lo que suele haber en stock. Si alguien necesita más, lo arregla en el chat.
- **Palabras fijas:** "confirmar" y "no está reservado". Nunca "comprado", "listo" ni "pedido hecho" antes de la respuesta de Falco.

### 6.3 Rendimiento y accesibilidad

- Objetivos en celular: Lighthouse de rendimiento ≥ 90 y LCP < 2,5 s.
- Las tipografías (Bricolage Grotesque, Instrument Sans y Martian Mono, todas con licencia OFL) **se sirven desde el propio sitio**, no desde Google Fonts.
- El logo es el SVG real. Grand Hotel era solo un reemplazo para los wireframes.
- Las fotos se suben ya achicadas desde el admin (WebP, 1600 px de lado máximo), así no hace falta pagar redimensionado de imágenes.
- Con `prefers-reduced-motion`: sin franjas, sin rebotes y sin carrusel automático.
- Todo lo que se toca mide al menos 44 px. El contraste mínimo es AA.

### 6.4 SEO local

- Título y descripción por página, e imagen para compartir en redes.
- JSON-LD `CafeOrCoffeeShop` con dirección, horarios (salen de la base), teléfono y redes.
- `sitemap.xml` con las fichas de producto visibles y `robots.txt`.
- Aparte del código: crear o actualizar el perfil de Google Maps. La mayoría de las búsquedas locales entran por ahí.

---

## 7. Admin

**Acceso:** en Cloudflare Access, una aplicación para `admin.falco.cafe` con una lista de mails permitidos y login con código por mail. Además, el Worker del admin valida el token de Access (`Cf-Access-Jwt-Assertion`) en cada pedido: si alguien llega salteando Access, la respuesta es 403. El mail del token se guarda en `updated_by`.

**Estilo:** la misma paleta y tipografías del sitio, pero sin los detalles de Persona. Es una herramienta, no una vidriera.

| Pantalla      | Qué hace                                                                                                                                                                    |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inicio**    | Qué hay en tolva, si el sitio dice "abierto" o "cerrado" en este momento, link al sitio                                                                                     |
| **Tolva**     | Elegir un café del catálogo y tocar "Poner en tolva". Muestra la tarjeta tal como se ve en el sitio                                                                         |
| **Cafés**     | Alta, edición y baja. El pentágono se carga con 5 controles del 1 al 5 y una vista previa en vivo                                                                           |
| **Productos** | Lista ordenable. Ficha: tipo, fila del carrusel, nombre, detalle, precio, descripción, arcano (número, nombre, porqué), foto, opciones, "Nuevo", visible, "Consultar stock" |
| **Horarios**  | La semana y los días especiales. Avisa si un día tiene hora de cierre antes que la de apertura                                                                              |
| **Ajustes**   | Número de WhatsApp (con un link de prueba), link de la carta, Instagram                                                                                                     |

- Cada guardado muestra un mensaje que dice exactamente qué pasó ("Guardado. Ya se ve en el sitio.") y limpia la caché de las páginas afectadas.
- No se puede borrar un café que está en la tolva ni uno que usa un producto: el admin explica por qué y qué hacer.
- **Fotos:** se eligen desde el celular, se achican en el navegador, se suben a R2 y la foto anterior se borra.

---

## 8. Métricas

Umami, sin cookies (no hace falta cartel de consentimiento). **Nunca se manda el nombre ni el comentario.**

| Evento                                                                                | Datos                                       |
| ------------------------------------------------------------------------------------- | ------------------------------------------- |
| `product_open`                                                                        | `slug`, `source` (`card`, `hopper`, `link`) |
| `product_add`                                                                         | `slug`, `qty`, `option`                     |
| `order_open`                                                                          | `items`, `units`                            |
| `order_send`                                                                          | `items`, `units`, `total_estimate`, `code`  |
| `order_resume_chat`                                                                   | —                                           |
| `directions_click` / `menu_click` / `instagram_click` / `dm_click` | —                                           |

**Preguntas que responden:** cuántos pedidos salen del sitio (`order_send`), en qué paso se cae la gente (`product_open` → `product_add` → `order_open` → `order_send`) y qué productos interesan aunque no se compren.

El código del pedido que va en el mensaje permite contar a mano, en WhatsApp, cuántos chats vinieron del sitio hasta que llegue la fase 2.

---

## 9. Seguridad y operación

- El Worker del sitio tiene **acceso de solo lectura** a los datos: solo hace consultas SELECT, y no hay rutas que escriban.
- Sin secretos en el navegador. El número de WhatsApp es público a propósito.
- El único secreto del proyecto es un token de la API de Cloudflare con permiso **solo para limpiar la caché**. Vive en el Worker del admin.
- CSP estricta en las dos apps. El sitio solo se conecta a sí mismo y a Umami.
- **Backups:** un Cron Trigger semanal exporta D1 a R2. Guardar las últimas 8 copias.
- **Entornos:** local (`wrangler dev` con D1 local), preview por rama y producción. Las migraciones se prueban en preview antes de producción.

---

## 10. Pruebas

- **Unitarias:** cálculo de "Abierto ahora" (hora de Argentina, días especiales, cierre a medianoche, próxima apertura), armado del mensaje y del link `wa.me`, lógica del pedido (sumar, quitar, límites, productos que desaparecen, vencimiento a los 3 días y a las 48 horas) y validaciones zod.
- **De punta a punta (Playwright):** elegir un producto → sumarlo → abrir el pedido → verificar que el link `wa.me` tiene el mensaje exacto. En el admin: editar la tolva y ver el cambio en el sitio.
- **Accesibilidad:** axe en las páginas principales.

---

## 11. Contenido que falta

| Qué                                                     | De quién | Bloquea         |
| ------------------------------------------------------- | -------- | --------------- |
| Logo en SVG (script "Falco" + murciélago)               | Falco    | Lanzamiento     |
| Foto del E65S del local (recortada, fondo transparente) | Falco    | Home            |
| Fotos de productos                                      | Falco    | Tienda          |
| Precios                                                 | Falco    | Tienda          |
| Número de WhatsApp                                      | Falco    | Pedido          |
| Horarios reales y feriados                              | Falco    | "Abierto ahora" |
| Link del PDF de la carta en Drive                       | Falco    | `/carta`        |
| Confirmar que el café se vende **solo en grano**        | Falco    | Tienda          |
| Disponibilidad de `falco.cafe`                          | Técnico  | Dominio         |

---

## 12. Orden de construcción

1. Repo, monorepo, `packages/ui` con los tokens y `packages/db` con el esquema, las migraciones y datos de prueba.
2. Sitio: estructura y secciones con datos de prueba (sin animaciones).
3. Lógica: "Abierto ahora", pedido y mensaje, con sus pruebas.
4. Admin: Access, ajustes, horarios, cafés, tolva, productos y fotos.
5. Animaciones y detalles Persona, siguiendo la lámina de sistema.
6. Métricas, SEO, 404 y rendimiento.
7. Dominio, carga del contenido real, pruebas en celulares reales y lanzamiento.

---

## 13. Decisiones tomadas

- Proyecto independiente de `falco-app`: repo, base y admin propios.
- Todo en Cloudflare: Workers, D1, R2 y Access.
- Sin pagos: el pedido se arma en el sitio y se confirma por WhatsApp.
- Varios productos por pedido. Solo retiro en el local. Café solo en grano (a confirmar).
- La carta es un PDF en Drive, detrás de `falco.cafe/carta`.
- Estilo: La Cueva × Persona, con máximo tres detalles Persona por pantalla, ángulos fijos y palabras fijas para el pedido.

## 14. Riesgos

| Riesgo                                       | Mitigación                                                                                                |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `falco.cafe` no está disponible o es caro    | Definirlo antes de la fase 1; `falcocafe.com.ar` como alternativa                                         |
| Dependencia de Cloudflare                    | Los datos son SQLite estándar y se exportan todas las semanas; Astro corre en otros hostings              |
| Se superan los límites gratis de D1          | Con la caché en el borde, muy lejano para este tráfico; si pasa, el plan pago de Workers es de bajo costo |
| La gente igual va a retirar sin confirmación | Palabras fijas, pasos 1-2-3, "Esperando confirmación" y el código de pedido para detectar el caso         |
| En escritorio sin WhatsApp instalado         | `wa.me` abre WhatsApp Web                                                                                 |
