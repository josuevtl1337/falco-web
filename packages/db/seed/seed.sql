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

-- Horario real: corta al mediodía y reabre a la tarde. weekday: 0 = domingo.
INSERT INTO business_hours (weekday) VALUES (0), (1), (2), (3), (4), (5), (6);

INSERT INTO business_hour_shifts (weekday, opens_at, closes_at) VALUES
  (1, '08:00', '12:30'), (1, '16:30', '20:30'),
  (2, '08:00', '12:30'), (2, '16:30', '20:30'),
  (3, '08:00', '12:30'), (3, '16:30', '20:30'),
  (4, '08:00', '12:30'), (4, '16:30', '20:30'),
  (5, '08:00', '12:30'), (5, '16:30', '20:30'),
  (6, '09:00', '13:00'), (6, '16:30', '20:30'),
  (0, '16:00', '20:00');

-- Feriados nacionales fijos de 2026 y 2027, más el Viernes Santo (móvil) de
-- cada año. Todos abren con el horario del domingo (16:00 - 20:00).
INSERT INTO special_days (date, note) VALUES
  ('2026-01-01', 'Año Nuevo'),
  ('2026-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2026-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2026-04-03', 'Viernes Santo'),
  ('2026-05-01', 'Día del Trabajador'),
  ('2026-05-25', 'Día de la Revolución de Mayo'),
  ('2026-06-20', 'Paso a la Inmortalidad del General Belgrano'),
  ('2026-07-09', 'Día de la Independencia'),
  ('2026-12-08', 'Inmaculada Concepción de María'),
  ('2026-12-25', 'Navidad'),
  ('2027-01-01', 'Año Nuevo'),
  ('2027-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia'),
  ('2027-03-26', 'Viernes Santo'),
  ('2027-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas'),
  ('2027-05-01', 'Día del Trabajador'),
  ('2027-05-25', 'Día de la Revolución de Mayo'),
  ('2027-06-20', 'Paso a la Inmortalidad del General Belgrano'),
  ('2027-07-09', 'Día de la Independencia'),
  ('2027-12-08', 'Inmaculada Concepción de María'),
  ('2027-12-25', 'Navidad');

INSERT INTO special_day_shifts (date, opens_at, closes_at)
  SELECT date, '16:00', '20:00' FROM special_days;

INSERT INTO settings (key, value) VALUES
  ('hopper_coffee_id', '1'),
  ('whatsapp_number', '543424667646'),
  ('menu_url', 'https://drive.google.com/drive/folders/1Kc-_fmuGcumnGHcCLFy0nz74ZkDJwSZH?usp=drive_link'),
  ('instagram_url', 'https://www.instagram.com/falco.cafe/');
