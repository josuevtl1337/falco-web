INSERT INTO coffees (id, name, farm, country, variety, process, altitude_masl, tasting_notes, description, acidity, sweetness, body, aroma, finish)
VALUES (1, 'Huila', 'Finca La Esperanza', 'Colombia', 'Caturra', 'Lavado', 1750, 'Durazno, panela, cítrico',
        'Luminoso y dulce. Se parece a un té de durazno, sin amargor.', 4, 5, 2, 4, 3);

INSERT INTO products (id, slug, kind, shelf, coffee_id, name, detail, price_ars, is_new, sort_order) VALUES
  (1, 'huila-colombia', 'coffee', 'coffee', 1, 'Huila · Colombia', '250 g · en grano', 12000, 1, 1),
  (2, 'filtros-v60-02', 'gear', 'kits', NULL, 'Filtros V60 · 02', 'Caja de 100', 6500, 0, 1),
  (3, 'remera-falco', 'apparel', 'kits', NULL, 'Remera Falco', 'Algodón', 16000, 0, 2);

INSERT INTO product_options (product_id, label, sort_order) VALUES
  (3, 'S', 1), (3, 'M', 2), (3, 'L', 3), (3, 'XL', 4);

INSERT INTO business_hours (weekday, is_closed, opens_at, closes_at) VALUES
  (0, 0, '15:00', '20:00'),
  (1, 0, '08:00', '20:00'),
  (2, 0, '08:00', '20:00'),
  (3, 0, '08:00', '20:00'),
  (4, 0, '08:00', '20:00'),
  (5, 0, '08:00', '20:00'),
  (6, 0, '08:00', '20:00');

INSERT INTO settings (key, value) VALUES
  ('hopper_coffee_id', '1'),
  ('whatsapp_number', '5493420000000'),
  ('menu_url', 'https://drive.google.com/'),
  ('instagram_url', 'https://www.instagram.com/falco.cafe/');
