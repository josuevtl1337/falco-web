# Arrastre del Plan 1 — lo que tienen que resolver los planes 2, 3 y 4

El Plan 1 (Fundaciones) quedó cerrado el 2026-09-20: `packages/domain`, `packages/db` y
`packages/ui`, 140 tests en verde y typecheck limpio. La review final de toda la rama encontró
2 hallazgos bloqueantes (ya arreglados) y una lista de cosas que **no son bugs de este plan**,
sino decisiones y piezas que le tocan a los planes siguientes.

Esta lista está acá porque el ledger de ejecución vive en `.superpowers/` (git-ignored) y se borra.

---

## Para el Plan 2 (sitio público)

1. **Llamar `pruneUnavailable` al cargar el pedido, ANTES de armar el mensaje.**
   `buildOrderMessage` y `orderTotal` descartan en silencio las líneas cuyo producto ya no está en
   el catálogo. Si el sitio no limpia primero, el mensaje puede quedar corto sin avisarle a nadie.
   Además hay que **decirle a la persona qué se le sacó del pedido**, no borrarlo calladamente.
2. **No llamar `markSent` al volver de WhatsApp.** Ya es idempotente (un segundo llamado devuelve el
   mismo objeto), pero el botón "volver al chat" no tiene que tocar el pedido.
3. **`setQty` no avisa cuando recorta.** Si alguien pide 5 unidades y el tope es 2, devuelve el
   pedido con 2 y nada más. La UI tiene que comparar antes/después para poder mostrar el aviso.
   Lo mismo con `addItem`, que devuelve `unit_limit` / `product_limit` y hay que mostrarlo.
4. **Las tres tipografías OFL están nombradas en los tokens pero nadie las sirve.** Falta el
   `@font-face` y los `.woff2` self-hosted, dentro del presupuesto de LCP.
5. **`@falco/ui` hoy tiene solo colores, tipografías, ángulos y easings.** No tiene escalas de
   espaciado, tamaños, radios ni duraciones, y **no tiene el token de 44 px de área táctil** que
   pide la spec (6.3). Definirlas en el plan, no improvisarlas en cada componente.
6. **El 8vo color de los wireframes (`--board: #18191b`) está bloqueado a propósito**: el test de
   tokens exige exactamente 7 colores. Si el sitio lo necesita, se agrega al token set y al test
   con una decisión explícita, no metiéndolo suelto en un CSS.
7. **La frase "no está reservado" no tiene casa ni test.** Es el corazón del flujo de pedido
   (spec 6.2): que viva en un lugar y que un test la fije.
8. **Falta el formateador de `openingHours` para el JSON-LD.** El dominio da el estado abierto/
   cerrado, no el string del schema.org.

## Marca y contenido (definido el 2026-09-20)

M1. **El logo ya está en el repo**, convertido del PDF a vector: `design/brand/logo-falco.svg`
    (fondo transparente, viewBox ajustado a la tinta), `logo-falco-sobre-carbon.svg` (con la
    tarjeta) y `logo-falco-oscuro.svg` (para fondos claros). `design/brand/prueba.html` los
    muestra a varios tamaños. Colores reales del vector: `#2A2A2C`, `#985D36`, `#ECE4CF`, `#FFF2E2`.
M2. **PENDIENTE DE DECISIÓN: los colores del vector no son los tokens de la paleta.**
    El tostado del logo es `#985D36` y el token dice `#885333` (lo sacó el dueño de una captura,
    que le comió saturación); hueso `#ECE4CF` vs `#E8E2D0`; carbón `#2A2A2C` vs `#292A2C`.
    Hay que decidir antes de maquetar el sitio: el logo va a estar al lado de esos colores.
M3. **El logo solo funciona sobre fondo oscuro** (el wordmark es crema). Sobre hueso hay que usar
    `logo-falco-oscuro.svg`.
M4. **Falta la marca compacta para el favicon**: el murciélago solo. El wordmark completo es un
    único path, no se puede recortar la "A" del archivo actual. Hay que pedirle el asset al dueño.
M5. **La foto del Mahlkönig E65S no va** (decisión del 2026-09-20). El hueco que tenía reservado
    en la home hay que resolverlo de otra manera en el Plan 2.
M6. **Los productos y precios del seed son genéricos**: el dueño los carga a mano después, desde
    el admin. No inventar catálogo real.

## Para el Plan 3 (panel de admin)

9. **`packages/db` no exporta tipos de fila ni un mapper `snake_case → camelCase`.** La spec (3)
   los lista como entregable. Si no se hacen primero, el sitio y el admin van a inventar cada uno
   el suyo. **Primera tarea del plan.**
10. **`WeekHours` (record, en el dominio) vs `weekHoursSchema` (array, en db): el adaptador no
    existe en ningún lado.** Hay que escribirlo una sola vez.
11. **`settings.hopper_coffee_id` no puede ser una FK** porque `settings` es clave-valor. La regla
    "la tolva apunta a un café que existe" (spec 7) hay que **enforzarla en código**, y decidir qué
    pasa con la tolva cuando se borra ese café.
12. **`imageKey` queda afuera de `productInputSchema` a propósito** (la subida a R2 es otro flujo).
    Confirmar el flujo y **qué borra los archivos huérfanos** de R2.
13. **Toda escritura tiene que setear `updated_at` y `updated_by`.** La migración agrega las
    columnas pero **no hay triggers**: lo pone la aplicación, con el mail del JWT de Cloudflare
    Access.
14. **`slugify` no resuelve unicidad** (y devuelve `""` con nombres sin letras latinas). El slug es
    `UNIQUE` en la base: el admin tiene que proponer, detectar el choque y sufijar.
15b. **Las opciones de producto ya no son solo talles**: el café se vende en grano o molido, y la
    elección se hace dentro del producto (el cuarto). La etiqueta se escribe entera en el admin
    ("En grano", "Molido", "Talle M") porque el mensaje de WhatsApp la imprime tal cual. El
    selector del sitio necesita un título; si se quiere ("Elegí la molienda" vs "Elegí el talle"),
    hay que sumar una columna `option_label` en `products`.

15. **`settingsSchema` es un objeto todo-o-nada** repartido entre dos pantallas del admin. Partirlo
    por clave o validar por campo.

15c. **`coffees.description` y `coffees.tasting_notes` no se muestran en ningún lado.** El dueño
    decidió el 2026-09-21 que el pentágono con sus etiquetas alcanza: las notas de cata son jerga
    para su público, y la descripción quedó afuera al seguir la lámina. Las columnas siguen en la
    base con contenido cargado, pero **el admin no puede ofrecerlas como si se publicaran**: o no
    van en el formulario, o van con un aviso de que hoy no se ven. Cargar un texto que no aparece
    en ningún lado es la peor experiencia posible de un panel.

## Para el Plan 4 (lanzamiento)

16. **No existe configuración de wrangler en ningún lado.** `wrangler d1 migrations` no tiene a qué
    apuntar, y `packages/db` no tiene script de migrate ni de seed.
17. **`STRICT` y `DEFAULT (strftime(...))` están verificados contra SQLite 3.53.4 local, no contra
    D1.** Verificarlos en el primer deploy real antes de cargar datos de verdad.

## Límites aceptados (no son bugs, están documentados)

18. **Los turnos que cruzan la medianoche no se pueden representar** (abrir 20:00 y cerrar 02:00).
    Las dos capas coinciden en esto. Si Falco alguna vez abre de noche, es un cambio de modelo.
19. **La etiqueta de reapertura es ambigua pasados 6 días** ("abre el sábado" dicho un sábado) y a
    los 14 días devuelve solo "Cerrado".
20. **El test de drift de `@falco/ui` va en un solo sentido**: detecta un token de TS sin su
    propiedad CSS, no una propiedad CSS huérfana.
21. **Ningún test cruza `packages/db` con `packages/domain`.** Los dos hablan el mismo dialecto de
    `HH:MM` (verificado a mano con 3000 strings), pero nada lo fija en CI.
22. **`orderTotal` sigue siendo una estimación**: el precio real lo confirma Falco por WhatsApp.
23. **`isOrder` no rechaza un `sentAt` en el futuro** (no recibe `now`). Un `localStorage` editado a
    mano podría estirar la ventana de 48 h.
