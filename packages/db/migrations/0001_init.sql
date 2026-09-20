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
