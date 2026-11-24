-- El puntaje SCA de un café (de 0 a 100, con decimales: 86.5): el que da el
-- tostadero o el importador. Es opcional; vacío, la ficha no lo muestra.
-- Va en las dos tablas de cafés porque comparten columnas y formulario.
ALTER TABLE coffees ADD COLUMN sca_score REAL CHECK (sca_score IS NULL OR (sca_score >= 0 AND sca_score <= 100));
ALTER TABLE hopper_coffees ADD COLUMN sca_score REAL CHECK (sca_score IS NULL OR (sca_score >= 0 AND sca_score <= 100));
