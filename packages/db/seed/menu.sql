-- Una carta de ejemplo para la base local: no son los precios de verdad, son
-- para ver la página /carta armada. La carta real se carga desde el admin.
-- Va aparte de seed.sql porque necesita la migración 0003.
INSERT INTO menu_categories (id, name, note, sort_order) VALUES
  (1, 'Café', 'Leche vegetal +$800', 1),
  (2, 'Filtrados', 'Con el café que esté en tolva', 2),
  (3, 'Sin café', NULL, 3),
  (4, 'Pastelería', 'Todo lo hacemos acá', 4);

INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES
  (1, 'Espresso', 'Doble shot', 3500, 1),
  (1, 'Cortado', 'Espresso con un toque de leche texturizada', 4200, 2),
  (1, 'Flat white', 'Doble shot y leche texturizada fina', 5600, 3),
  (1, 'Latte', 'Un shot y más leche, en taza grande', 5400, 4),
  (1, 'Iced latte', 'Espresso, leche y hielo', 5900, 5),
  (2, 'V60', 'Filtrado a mano, para una taza', 5200, 1),
  (2, 'Aeropress', NULL, 5200, 2),
  (2, 'Cold brew', 'Infusionado en frío por 18 horas', 6000, 3),
  (3, 'Chai latte', 'Especias y leche texturizada', 5200, 1),
  (3, 'Limonada', 'Con menta y jengibre', 4800, 2),
  (4, 'Medialuna', NULL, 1500, 1),
  (4, 'Budín de limón', 'La porción', 3200, 2),
  (4, 'Cookie de chocolate', 'Con chips de chocolate amargo', 2800, 3),
  (4, 'Alfajor de maicena', NULL, 2500, 4);
