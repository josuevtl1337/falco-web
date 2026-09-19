# Falco Web — Scope

Sitio de Falco (café de especialidad, Iriondo 2153, Santo Tomé). No es un e-commerce.
Presenta el local, muestra el café en tolva y deja armar un pedido que se confirma
por WhatsApp y se retira en el local.

Diseño de referencia: design/persona/wireframes.html (v7.6).
Detalle técnico completo: docs/superpowers/specs/2026-09-18-falco-web-design.md

## 1. Qué entra (fase 1)

Sitio público (falco.cafe)

- Home: calendario del día + "Abierto ahora", título, misión, café en tolva
  (origen, tostadero, pentágono de cata, foto del E65S).
- Tienda: dos carruseles (Café / Kits y accesorios). Tocar una ficha abre su detalle.
- Detalle de producto: panel en escritorio, hoja que sube en celular. URL propia /tienda/[slug].
- Pedido: lista "Tu pedido", pasos 1-2-3, mensaje armado y link a WhatsApp.
  Pantalla "Esperando confirmación" al volver.
- Dónde estamos: dirección, horarios (fila de hoy marcada), mapa, botones
  "Cómo llegar", "Ver la carta", "Escribir por DM".
- /carta: redirección 302 al PDF de Google Drive (link editable desde el admin).
- 404.

Admin (admin.falco.cafe)

- Login con Cloudflare Access (código por mail, lista de mails permitidos).
- Tolva: elegir qué café está en tolva.
- Cafés: alta, edición y baja (origen, variedad, proceso, altura, notas, pentágono 1-5).
- Productos: alta, edición, baja y orden; foto, precio, talles, Nuevo, visible,
  "Consultar stock".
- Horarios: semana + días especiales (feriados).
- Ajustes: número de WhatsApp, link de la carta, Instagram.

Infra y métricas

- Dominio, DNS, hosting y deploy en Cloudflare.
- Métricas con Umami (sin cookies).
- SEO local: títulos, imagen para compartir, JSON-LD de cafetería, sitemap.

## 2. Qué NO entra

- Pagos, checkout, cuentas de clientes.
- Stock en números (el stock se confirma por WhatsApp).
- Envíos (solo retiro en el local).
- Conexión con falco-app / POS. El proyecto es independiente.

Fase 2 (después del lanzamiento)

- Pedidos guardados con código y estado (confirmado / retirado). Al marcarlo como
  retirado, el pedido se borra del navegador de la persona.
- Carta propia en el sitio en lugar del PDF.
- Pantalla de carga con el murciélago (sin decidir).

## 3. Stack

- Repo propio: falco-web (monorepo).
  - `apps/site`: sitio público (Astro, SSR en Cloudflare Workers)
  - `apps/admin`: panel (Astro, SSR en Cloudflare Workers)
  - `packages/db`: esquema D1, migraciones, tipos, validaciones (zod)
  - `packages/ui`: tokens de diseño (colores, tipografías, ángulos)
- Base: Cloudflare D1. Fotos: Cloudflare R2. Login del admin: Cloudflare Access.
- TypeScript. CSS propio con variables. Islas de React solo donde hay interacción.
- El sitio solo lee de la base. El admin es el único que escribe.
- Textos que ve el usuario en español; código, tablas y rutas en inglés.

## 4. Datos

- **coffees**: name, farm, country, variety, process, altitude_masl,
  tasting_notes, description, roaster (default "Puerto Blest"),
  acidity, sweetness, body, aroma, finish (1-5)
- **products**: slug, kind (coffee | gear | kit | apparel), shelf (coffee | kits),
  coffee_id, name, detail, description, price_ars (entero),
  image_key, is_new, is_visible, ask_stock, sort_order
- **product_options**: product_id, label (ej. "M"), is_available, sort_order
- **business_hours**: weekday (0 = domingo), is_closed, opens_at, closes_at
- **special_days**: date, is_closed, opens_at, closes_at, note
- **settings**: hopper_coffee_id, whatsapp_number, menu_url, instagram_url

Todas las tablas editables guardan updated_at y updated_by (mail del admin).

## 5. Reglas de negocio

Abierto ahora

- Se calcula con la hora de America/Argentina/Buenos_Aires, nunca la del dispositivo.
- Prioridad: special_days del día > business_hours.
- Textos: "Abierto ahora · cierra HH:MM" / "Cerrado · abre HH:MM" /
  "Cerrado · abre mañana HH:MM" (o el próximo día que abra).

Pedido

- Se guarda en localStorage (falco.order.v1): productos, cantidades, talle,
  nombre, comentario, código (F-XXXX), fecha del último cambio y fecha de envío.
- Vencimiento: sin enviar, se borra a los 3 días sin cambios; enviado, a las 48 horas;
  "Empezar otro pedido" lo borra en el momento.
- Varios productos por pedido. Máximo 20 productos distintos y 2 unidades de cada uno
  (para no pedir más de lo que suele haber en stock).
- Los precios se toman siempre de la base. El total se llama "Total estimado".
- Productos que dejaron de estar visibles se quitan solos del pedido.
- Link: https://wa.me/{whatsapp_number}?text={mensaje}
- Mensaje:

```text
¡Buenas! Soy {nombre} y quiero hacer este pedido ({código}):

• {cantidad} × {producto} · {detalle}[ · talle {talle}]

Total estimado: $ {total}
Lo retiraría en el local cuando me confirmen.
[Comentario: {comentario}.]

¿Me confirman si hay stock y desde qué hora lo puedo retirar?
```

- Palabras fijas: "confirmar" y "no está reservado".
  Nunca "comprado", "listo" ni "pedido hecho" antes de la respuesta de Falco.

Café en tolva

- Hay uno solo: settings.hopper_coffee_id.
- No se puede borrar un café que está en tolva o que usa un producto.

## 6. Calidad mínima

- Celular primero. Lighthouse de rendimiento >= 90 en celular. LCP < 2,5 s.
- Todo lo tocable mide al menos 44 px. Contraste AA.
- prefers-reduced-motion: sin animaciones de entrada, sin carrusel automático.
- Tipografías servidas desde el sitio (no Google Fonts).
- Fotos subidas en WebP, máximo 1600 px de lado (se achican en el navegador del admin).
- Pruebas unitarias: "Abierto ahora", mensaje y link de WhatsApp, lógica del pedido
  (incluido el vencimiento).
- Prueba de punta a punta: elegir producto -> sumarlo -> link de WhatsApp con el mensaje exacto.
- Backup semanal de D1 a R2.

## 7. Métricas (Umami)

product_open, product_add, order_open, order_send, order_resume_chat,
directions_click, menu_click, instagram_click, dm_click.
Nunca se envía el nombre ni el comentario del pedido.

## 8. Contenido que falta (Falco)

- [ ] Logo en SVG (script "Falco" + murciélago)
- [ ] Foto del E65S del local, recortada
- [ ] Fotos y precios de productos
- [ ] Número de WhatsApp
- [ ] Horarios reales y feriados
- [ ] Link del PDF de la carta en Drive
- [ ] Confirmar: el café se vende solo en grano
- [ ] Confirmar que falco.cafe está disponible (si no, elegir otro dominio)

## 9. Terminado cuando

- [ ] falco.cafe muestra todas las secciones con datos reales de la base.
- [ ] Un cambio en el admin (tolva, producto, horario) se ve en el sitio en menos de 1 minuto.
- [ ] Se puede armar un pedido y llega a WhatsApp con el mensaje exacto.
- [ ] "Abierto ahora" es correcto con la hora de Argentina, incluidos feriados.
- [ ] /carta redirige al PDF actual.
- [ ] Solo los mails permitidos entran al admin.
- [ ] Umami registra los eventos de la lista.
- [ ] Pasan las pruebas y se cumplen los mínimos de la sección 6.
- [ ] Probado en al menos un Android y un iPhone reales.
