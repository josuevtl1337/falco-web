-- La foto del café en tolva: la home la muestra en la vitrina en lugar del
-- molino. Es la clave del objeto en R2 (tolva/<id>-<hash>.<ext>), igual que
-- products.image_key. Vacía, la home sigue mostrando el molino.
ALTER TABLE hopper_coffees ADD COLUMN image_key TEXT;
