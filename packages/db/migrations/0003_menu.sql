-- La carta del local, la que se pide en la barra: categorías (Café, Pastelería,
-- Sin café...) y lo que hay en cada una. No tiene nada que ver con la tienda:
-- un ítem de la carta no se suma al pedido, se pide en el mostrador.
--
-- /carta muestra esto. Mientras esté vacía, sigue mandando al PDF de
-- settings.menu_url, así nada se rompe hasta que la carta esté cargada.
CREATE TABLE menu_categories (
  id              INTEGER PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  -- Una línea debajo del título: "Leche vegetal +$500", "Todo el día".
  note            TEXT,
  is_visible      INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT
) STRICT;

-- Un precio solo: el de la barra. La foto es opcional, igual que en la tienda
-- (clave de R2, carta/<id>-<hash>.<ext>).
CREATE TABLE menu_items (
  id              INTEGER PRIMARY KEY,
  category_id     INTEGER NOT NULL REFERENCES menu_categories(id),
  name            TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description     TEXT,
  price_ars       INTEGER NOT NULL CHECK (price_ars >= 0),
  image_key       TEXT,
  is_visible      INTEGER NOT NULL DEFAULT 1 CHECK (is_visible IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_by      TEXT
) STRICT;

CREATE INDEX menu_categories_order ON menu_categories (sort_order);
CREATE INDEX menu_items_category_order ON menu_items (category_id, sort_order);
