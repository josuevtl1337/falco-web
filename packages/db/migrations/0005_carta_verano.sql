-- La carta de verano, tal cual la impresa (Carta-Falco-verano-imprenta.pdf):
-- categorías, ítems, descripciones y precios. Va como migración para que el
-- deploy la cargue en producción una sola vez; de ahí en más se edita desde
-- el admin (pestaña Carta), como cualquier otra cosa.
--
-- Lo que en el papel es un ícono va en palabras: el copo de nieve de
-- "opcional frío" queda en la descripción de cada ítem que lo lleva, y los
-- extras (+$1.000) en la nota de la categoría.

INSERT INTO menu_categories (name, note, sort_order) VALUES ('Clásicos', 'Opcional frío, agrandá tu taza o leche vegetal: +$1.000 cada uno', 1);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Dulces y cremosos', 'Opcional frío, agrandá tu taza o leche vegetal: +$1.000 cada uno', 2);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Fríos', 'Con hielo de cold brew · Todos $6.500', 3);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Sin café', 'Calientes y fríos, para todos', 4);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Milkshakes', NULL, 5);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Vermú', 'La Fuerza con tónica · +18', 6);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Salados', NULL, 7);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Dulces', NULL, 8);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Rellenos', 'Dulce: crema de avellanas · Salado: jamón y queso', 9);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Tortas', 'Panadería: mirá la vitrina. Consultá opciones sin TACC.', 10);
INSERT INTO menu_categories (name, note, sort_order) VALUES ('Combos', NULL, 11);

INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Clásicos'), 'Espresso', 'Fuerte, corto e intenso.', 4200, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Clásicos'), 'Americano', 'Espresso doble, con agua. Opcional frío.', 4400, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Clásicos'), 'Filtrado', 'Método V60. Opcional frío.', 6000, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Clásicos'), 'Café con leche', 'Espresso doble con leche texturizada. Opcional frío.', 5000, 4);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Dulces y cremosos'), 'Moka', 'Espresso, chocolate y leche espumada. Pedilo con cacao o canela. Opcional frío.', 5800, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Dulces y cremosos'), 'Café bombón', 'Base de leche condensada. Opcional frío.', 5800, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Dulces y cremosos'), 'Latte saborizado', 'Base de caramelo o vainilla, vos elegís. Opcional frío.', 5800, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Dulces y cremosos'), 'Irlandés', 'Whisky y espuma de leche.', 6500, 4);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Fríos'), 'Falco cream', 'Espresso doble con leche condensada, leche texturizada y crema chantilly.', 6500, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Fríos'), 'Espresso tonic', 'Tónica, hielo y espresso doble.', 6500, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Fríos'), 'Cold brew', 'Café extraído en frío y gasificado, con hielo.', 6500, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Fríos'), 'Affogato', 'Helado, salsa de chocolate y café.', 6500, 4);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Chocolatada · Submarino', 'Chocolatada clásica o submarino.', 4500, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Té en hebras', 'Elegí el blend que más te guste.', 4500, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Limonada', 'Tradicional o de frutos rojos.', 5000, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Licuado', 'Fruta de estación.', 7000, 4);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Jugo de naranja', 'Recién exprimido.', 5000, 5);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Té helado', 'Té en hebras infusionado en frío.', 5000, 6);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Sin café'), 'Sodita · Agua', 'Sodita Estambul o agua mineral.', 3000, 7);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Milkshakes'), 'Dulce de leche', NULL, 8000, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Milkshakes'), 'Frutilla', NULL, 8000, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Milkshakes'), 'Oreo', NULL, 8000, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Vermú'), 'Vermú Rojo', NULL, 7000, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Vermú'), 'Vermú Blanco', NULL, 7000, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Vermú'), 'Ramazzotti', NULL, 7000, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Salados'), 'Avocado', '2 tostadas de pan integral con palta, huevo revuelto y queso crema.', 12000, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Salados'), 'Tostadas con huevos revueltos', 'Pan tostado con huevos revueltos, queso crema y semillas.', 8000, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Salados'), 'Tostados', 'Jamón: jamón cocido, muzza y manteca. Salame: salame, muzza, mostaza Dijon y aceite de oliva.', 8500, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Salados'), 'Focaccia de mortadela', 'Mortadela, muzzarella, tomatitos cherry confitados y aceite de oliva.', 14000, 4);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Dulces'), 'Tostadas', 'Queso crema y mermelada o miel.', 6000, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Dulces'), 'Bowl de yogur', 'Yogur natural, frutas frescas, granola y miel.', 8000, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Rellenos'), 'Medialuna rellena', 'Dulce o salada.', 5500, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Rellenos'), 'Croissant relleno', 'Dulce o salado.', 7000, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Rellenos'), 'Scon relleno', 'Salado.', 6000, 3);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Tortas'), 'Porción', 'Cheesecake, Tiramisú, Matilda o Lemon Pie. Consultá el stock.', 8500, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Combos'), '2 medialunas de manteca + infusión', NULL, 8500, 1);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Combos'), '2 scones de queso + infusión', NULL, 10000, 2);
INSERT INTO menu_items (category_id, name, description, price_ars, sort_order) VALUES ((SELECT id FROM menu_categories WHERE name = 'Combos'), 'Focaccia de mortadela + vermú', NULL, 18000, 3);
