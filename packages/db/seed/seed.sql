INSERT INTO coffees (id, name, farm, country, variety, process, altitude_masl, tasting_notes, description, acidity, sweetness, body, aroma, finish)
VALUES (1, 'Huila', 'Finca La Esperanza', 'Colombia', 'Caturra', 'Lavado', 1750, 'Durazno, panela, cítrico',
        'Luminoso y dulce. Se parece a un té de durazno, sin amargor.', 4, 5, 2, 4, 3);

-- La tolva, su propio catálogo. Huila está en tolva y además se vende (vive
-- en las dos tablas); los otros dos son de ejemplo, para probar el admin.
INSERT INTO hopper_coffees (id, name, farm, country, variety, process, altitude_masl, tasting_notes, description, acidity, sweetness, body, aroma, finish) VALUES
  (1, 'Huila', 'Finca La Esperanza', 'Colombia', 'Caturra', 'Lavado', 1750, 'Durazno, panela, cítrico',
      'Luminoso y dulce. Se parece a un té de durazno, sin amargor.', 4, 5, 2, 4, 3),
  (2, 'Sidama', 'Guji', 'Etiopía', 'Heirloom', 'Natural', 2100, 'Floral, bergamota, miel',
      'Perfumado y liviano, como un té negro con miel.', 4, 4, 2, 5, 4),
  (3, 'Cerrado', 'Fazenda Esperança', 'Brasil', 'Catuaí', 'Natural', 1100, 'Chocolate, nuez, caramelo',
      'Redondo y dulce, para quien viene del café de siempre.', 2, 4, 4, 3, 3);

-- El catálogo real que mandó el dueño el 2026-09-21. price_card_ars es lo
-- que se cobra con crédito o débito; price_cash_ars, con efectivo o
-- transferencia (siempre el más barato de los dos).
-- El catálogo real se muestra entero. Los casos que las pruebas necesitan
-- (un producto invisible, uno con "Consultar stock" y una opción agotada)
-- viven en el borrador oculto del final, que nunca se ve en el sitio.
INSERT INTO products (id, slug, kind, shelf, coffee_id, name, detail, price_card_ars, price_cash_ars, is_new, is_visible, ask_stock, sort_order) VALUES
  (1, 'huila-colombia', 'coffee', 'coffee', 1, 'Huila · Colombia', '250 g', 13000, 12000, 1, 1, 0, 1),
  (2, 'prensa', 'gear', 'kits', NULL, 'Prensa', 'Cafetera de émbolo', 35000, 33000, 0, 1, 0, 1),
  (3, 'filtro-aeropress', 'gear', 'kits', NULL, 'Filtro Aeropress', 'Filtro para Aeropress', 28000, 26000, 0, 1, 0, 2),
  (4, 'filtros-v60-2', 'gear', 'kits', NULL, 'Filtros V60 · 2', 'Filtros de papel para V60', 28000, 26000, 0, 1, 0, 3),
  (5, 'kit-v60-1', 'kit', 'kits', NULL, 'Kit V60 · 1', 'V60 tamaño 1 + filtros', 53500, 50500, 0, 1, 0, 4),
  (6, 'kit-v60-2', 'kit', 'kits', NULL, 'Kit V60 · 2', 'V60 tamaño 2 + filtros', 66000, 62000, 0, 1, 0, 5),
  (7, 'coffeepress', 'gear', 'kits', NULL, 'Coffeepress', 'Para café filtrado', 67500, 64500, 0, 1, 0, 6),
  -- Borrador oculto: existe para que las pruebas tengan un producto
  -- invisible, uno con "Consultar stock" y una opción agotada, sin
  -- mentir sobre el catálogo real. Al estar oculto, no se ve en el sitio.
  (8, 'producto-de-prueba', 'gear', 'kits', NULL, 'Producto de prueba', 'Solo para probar el sitio', 1000, 900, 0, 0, 1, 99);

-- El café se elige en grano o molido; es la única opción real hoy, porque
-- la ropa quedó para más adelante.
INSERT INTO product_options (product_id, label, is_available, sort_order) VALUES
  (1, 'En grano', 1, 0), (1, 'Molido', 1, 1),
  -- La opción agotada vive en el borrador oculto, no en el café.
  (8, 'Con caja', 1, 0), (8, 'Sin caja', 0, 1);

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
