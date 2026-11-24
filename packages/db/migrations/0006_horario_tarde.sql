-- Horario nuevo: todos los días, de 17:00 a 21:00, de corrido. Va como
-- migración para que el deploy lo cargue en producción una sola vez; de ahí
-- en más se edita desde el admin (Horarios), como siempre.
--
-- Sale de business_hours y no de una lista fija: en una base recién creada
-- (antes del seed) no hay días, y no se inserta nada.

DELETE FROM business_hour_shifts;
INSERT INTO business_hour_shifts (weekday, opens_at, closes_at)
  SELECT weekday, '17:00', '21:00' FROM business_hours;

-- Los feriados que abren pasan al mismo horario, en un solo tramo: queda el
-- primero de cada día y se le cambian las horas. Los que están cerrados (sin
-- tramos) siguen cerrados.
DELETE FROM special_day_shifts
  WHERE opens_at > (SELECT min(s.opens_at) FROM special_day_shifts s
                    WHERE s.date = special_day_shifts.date);
UPDATE special_day_shifts SET opens_at = '17:00', closes_at = '21:00';
