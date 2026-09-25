-- Cafés: catálogo. Un café puede estar en la tolva, en la tienda, o en los dos.
CREATE TABLE coffees (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL CHECK (length(trim(name)) > 0),
  farm            TEXT,
  country         TEXT NOT NULL CHECK (length(trim(country)) > 0),
  variety         TEXT,
  process         TEXT,
  altitude_masl   INTEGER CHECK (altitude_masl IS NULL OR altitude_masl BETWEEN 0 AND 3000),
  tasting_notes   TEXT,
  description     TEXT,
  roaster         TEXT NOT NULL DEFAULT 'Puerto Blest' CHECK (length(trim(roaster)) > 0),
  acidity         INTEGER NOT NULL CHECK (acidity BETWEEN 1 AND 5),
  sweetness       INTEGER NOT NULL CHECK (sweetness BETWEEN 1 AND 5),
  body            INTEGER NOT NULL CHECK (body BETWEEN 1 AND 5),
  aroma           INTEGER NOT NULL CHECK (aroma BETWEEN 1 AND 5),
  finish          INTEGER NOT NULL CHECK (finish BETWEEN 1 AND 5),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT
) STRICT;

-- Productos de la tienda. El slug es la ruta de /tienda/, así que respeta el mismo
-- formato que valida zod: minúsculas, números y guiones simples.
CREATE TABLE products (
  id              INTEGER PRIMARY KEY,
  slug            TEXT NOT NULL UNIQUE CHECK (length(slug) > 0 AND slug NOT GLOB '*[^a-z0-9-]*'
                    AND slug NOT GLOB '-*' AND slug NOT GLOB '*-' AND slug NOT GLOB '*--*'),
  kind            TEXT NOT NULL CHECK (kind IN ('coffee', 'gear', 'kit', 'apparel')),
  shelf           TEXT NOT NULL CHECK (shelf IN ('coffee', 'kits')),
  coffee_id       INTEGER REFERENCES coffees(id),
  name            TEXT NOT NULL CHECK (length(trim(name)) > 0),
  detail          TEXT NOT NULL CHECK (length(trim(detail)) > 0),
  description     TEXT,
  price_card_ars  INTEGER NOT NULL CHECK (price_card_ars >= 0),
  price_cash_ars  INTEGER NOT NULL CHECK (price_cash_ars >= 0),
  image_key       TEXT,
  is_new          INTEGER NOT NULL DEFAULT 0 CHECK (is_new IN (0, 1)),
  is_visible      INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  ask_stock       INTEGER NOT NULL DEFAULT 0 CHECK (ask_stock IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT,
  CHECK (kind = 'coffee' OR coffee_id IS NULL)
) STRICT;

-- Opciones de un producto: hoy, la molienda del café (en grano o molido).
CREATE TABLE product_options (
  id              INTEGER PRIMARY KEY,
  product_id      INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label           TEXT NOT NULL CHECK (length(trim(label)) > 0),
  is_available    INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT,
  UNIQUE (product_id, label)
) STRICT;

-- Horario semanal. weekday: 0 = domingo … 6 = sábado. Un día puede tener varios
-- tramos (el local corta al mediodía); cero tramos es un día cerrado, así que
-- esa fila no necesita ninguna hora propia.
CREATE TABLE business_hours (
  weekday         INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT
) STRICT;

-- Un tramo por fila. Horas de Argentina, "HH:MM" o "24:00". Los CHECK de hora
-- aceptan exactamente lo que parseHHMM sabe leer: "8:00" queda afuera.
-- PRIMARY KEY (weekday, opens_at) también rechaza dos tramos con la misma
-- hora de apertura el mismo día.
CREATE TABLE business_hour_shifts (
  weekday         INTEGER NOT NULL REFERENCES business_hours(weekday) ON DELETE CASCADE,
  opens_at        TEXT NOT NULL CHECK (opens_at GLOB '[0-2][0-9]:[0-5][0-9]'
                    AND (substr(opens_at, 1, 2) <= '23' OR opens_at = '24:00')),
  closes_at       TEXT NOT NULL CHECK (closes_at GLOB '[0-2][0-9]:[0-5][0-9]'
                    AND (substr(closes_at, 1, 2) <= '23' OR closes_at = '24:00')),
  PRIMARY KEY (weekday, opens_at),
  CHECK (closes_at > opens_at)
) STRICT;

-- Feriados y días con horario distinto. Tienen prioridad sobre business_hours.
-- Un día especial sin tramos está cerrado, aunque el horario semanal diga
-- que abre — reemplaza al viejo is_closed, que se podía contradecir con las
-- horas cargadas. "date IS strftime(...)" exige una fecha real: usa IS y no
-- =, porque strftime devuelve NULL con basura y un CHECK que da NULL pasa.
CREATE TABLE special_days (
  date            TEXT PRIMARY KEY CHECK (date IS strftime('%Y-%m-%d', date)),
  note            TEXT,
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT
) STRICT;

-- Un tramo por fila, igual que business_hour_shifts.
CREATE TABLE special_day_shifts (
  date            TEXT NOT NULL REFERENCES special_days(date) ON DELETE CASCADE,
  opens_at        TEXT NOT NULL CHECK (opens_at GLOB '[0-2][0-9]:[0-5][0-9]'
                    AND (substr(opens_at, 1, 2) <= '23' OR opens_at = '24:00')),
  closes_at       TEXT NOT NULL CHECK (closes_at GLOB '[0-2][0-9]:[0-5][0-9]'
                    AND (substr(closes_at, 1, 2) <= '23' OR closes_at = '24:00')),
  PRIMARY KEY (date, opens_at),
  CHECK (closes_at > opens_at)
) STRICT;

-- Ajustes sueltos. Claves: hopper_coffee_id, whatsapp_number, menu_url, instagram_url.
CREATE TABLE settings (
  key             TEXT PRIMARY KEY CHECK (length(trim(key)) > 0),
  value           TEXT NOT NULL CHECK (length(trim(value)) > 0),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT
) STRICT;

CREATE INDEX products_shelf_order ON products (shelf, sort_order);
