INSERT INTO coffees (id, name, farm, country, variety, process, altitude_masl, tasting_notes, description, acidity, sweetness, body, aroma, finish)
VALUES (1, 'Huila', 'Finca La Esperanza', 'Colombia', 'Caturra', 'Lavado', 1750, 'Durazno, panela, cítrico',
        'Luminoso y dulce. Se parece a un té de durazno, sin amargor.', 4, 5, 2, 4, 3);

-- Los últimos dos productos son casos de prueba: uno escondido del sitio
-- (is_visible = 0) y uno que se pide consultando stock (ask_stock = 1).
INSERT INTO products (id, slug, kind, shelf, coffee_id, name, detail, price_ars, is_new, is_visible, ask_stock, sort_order) VALUES
  (1, 'huila-colombia', 'coffee', 'coffee', 1, 'Huila · Colombia', '250 g', 12000, 1, 1, 0, 1),
  (2, 'filtros-v60-02', 'gear', 'kits', NULL, 'Filtros V60 · 02', 'Caja de 100', 6500, 0, 1, 0, 1),
  (3, 'remera-falco', 'apparel', 'kits', NULL, 'Remera Falco', 'Algodón', 16000, 0, 1, 0, 2),
  (4, 'prensa-francesa', 'gear', 'kits', NULL, 'Prensa francesa', '350 ml', 28000, 0, 0, 0, 3),
  (5, 'kit-filtrado', 'kit', 'kits', NULL, 'Kit de filtrado', 'V60 + filtros + jarra', 52000, 0, 1, 1, 4);

-- El café se elige en grano o molido; la remera, por talle.
-- El talle XS va agotado (is_available = 0) para poder probar pruneUnavailable.
INSERT INTO product_options (product_id, label, is_available, sort_order) VALUES
  (1, 'En grano', 1, 0), (1, 'Molido', 1, 1),
  (3, 'Talle XS', 0, 0), (3, 'Talle S', 1, 1), (3, 'Talle M', 1, 2),
  (3, 'Talle L', 1, 3), (3, 'Talle XL', 1, 4);

INSERT INTO business_hours (weekday, is_closed, opens_at, closes_at) VALUES
  (0, 0, '15:00', '20:00'),
  (1, 0, '08:00', '20:00'),
  (2, 0, '08:00', '20:00'),
  (3, 0, '08:00', '20:00'),
  (4, 0, '08:00', '20:00'),
  (5, 0, '08:00', '20:00'),
  (6, 0, '08:00', '20:00');

-- Un feriado cerrado, para ver cómo queda el cartel de "Abierto ahora".
INSERT INTO special_days (date, is_closed, opens_at, closes_at, note) VALUES
  ('2026-12-25', 1, NULL, NULL, 'Navidad');

INSERT INTO settings (key, value) VALUES
  ('hopper_coffee_id', '1'),
  ('whatsapp_number', '5493420000000'),
  ('menu_url', 'https://drive.google.com/'),
  ('instagram_url', 'https://www.instagram.com/falco.cafe/');
