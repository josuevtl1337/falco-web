# Falco Web — Handoff

Documento para retomar el proyecto en una sesión nueva sin perder contexto.
**Si sos Claude en una sesión nueva: leé este archivo entero y después `SCOPE.md` antes de hacer nada.**

Última actualización: 2026-09-19.

---

## 1. Qué es

El sitio web de **Falco**, café de especialidad en **Iriondo 2153, Santo Tomé (Santa Fe, Argentina)**.
Instagram: `@falco.cafe`. Tostadero: **Puerto Blest**. Molino: **Mahlkönig E65S** (NO el GbW, sin balanza: su display muestra segundos de molienda).

- No es un e-commerce. Presenta el local, muestra el café que está en tolva y deja armar un pedido que **se confirma por WhatsApp** y **se retira en el local**.
- **Público:** gente de Santo Tomé que recién conoce el café de especialidad. Nada de jerga sin explicación.
- **Misión:** "Nuestra misión siempre fue la misma: traer el mundo del café a Santo Tomé."
- **Mascota:** un murciélago (cara estilo cartoon retro). **No es un halcón.**
- **Logo:** "Falco" en script blanco + "café de santoto" en sans espaciada; una gota y un grano de café en la "a" y la "o". Fondo `#292A2C`.

## 2. Dónde está todo

| Qué                                               | Dónde                                                                                                                  |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Alcance del proyecto (el archivo de trabajo)**  | `SCOPE.md`                                                                                                             |
| Spec técnica completa                             | `docs/superpowers/specs/2026-09-18-falco-web-design.md` · publicada: https://claude.ai/artifact/Pucn6WVS5N2MdWLgWUShtM |
| **Wireframes actuales (v7.6)**                    | `design/persona/wireframes.html` · publicados: https://claude.ai/artifact/99tGRDChQ1v8CYykgoB4HS                       |
| Exploración Persona (los 8 detalles)              | `design/persona/falco-persona.html` · https://claude.ai/artifact/8G69Rw446g3QecDFXPUN1n                                |
| Wireframes anteriores v6 "La Cueva" (sin Persona) | `design/*.dc.html` · https://claude.ai/code/artifact/620f9c8b-bea4-408d-a1e4-60013061b258                              |
| Respaldo de v6                                    | `design/_respaldo-v6-la-cueva/`                                                                                        |
| Versiones previas de v7                           | `design/persona/_v7.*-wireframes.html`                                                                                 |

**Cómo se arman los wireframes v7:** `wireframes.html` se genera; **no se edita a mano**.

- Fuentes: `design/persona/wireframes.src.html` (estructura y CSS con marcadores `%%...%%`) y `design/persona/pedido.section.html` (la vista de pedido).
- Piezas repetidas: `design/persona/build.py` (fichas de productos) y `design/persona/build_wf.py` (calendario, pentágono, mapa, pedido, mensaje).
- Para regenerar: `cd design/persona && python3 build_wf.py`.
- Si existe `design/persona/e65s.png` (o .jpg / .webp), se incrusta sola como foto del molino.

## 3. Diseño: "La Cueva × Persona"

**Base "La Cueva":** oscuro, un solo pozo de luz cálida por sección, grano de película encima.
**Persona:** detalles sutiles de la interfaz de los juegos Persona. **Máximo tres por pantalla.**

**Paleta** (sale del logo):

| Nombre  | Hex       | Uso                                                 |
| ------- | --------- | --------------------------------------------------- |
| Carbón  | `#292A2C` | fondo                                               |
| Piedra  | `#313335` | paneles                                             |
| Sombra  | `#1E1F21` | cajas de diálogo, sombras duras                     |
| Tostado | `#885333` | placas, sombras corridas; hace de "rojo de Persona" |
| Hueso   | `#E8E2D0` | texto, placa activa, botón primario                 |
| Ceniza  | `#9A9C9E` | texto secundario                                    |
| Brasa   | `#F2C48B` | solo luz y la placa "Abierto ahora"                 |

Nada de rojo. El usuario rechazó el verde como color principal y el naranja `#E8873A` de las versiones viejas.

**Tipografías:** Bricolage Grotesque (títulos), Instrument Sans (texto), Martian Mono (datos y etiquetas). El script del logo es solo para el logo; en los wireframes lo reemplaza Grand Hotel, y en producción va el SVG real.

**Detalles Persona que quedaron:**

- Calendario del día: el número cambia de día con una franja tostada detrás. Usa la fecha real, y a la medianoche dice "Hora oscura".
- "Abierto ahora": placa que se prende en brasa, con brillo. Cerrado: placa apagada, solo borde.
- Caja de diálogo: solo para la misión ("Falco") y en Dónde estamos ("Barista").
- Pentágono de cata (acidez, dulzor, cuerpo, aroma, final; del 1 al 5). Se forma punta por punta al aparecer.
- Menú inclinado (el del celular a pantalla completa le encantó al usuario).
- Corte diagonal entre secciones, solo al tocar un link del menú.
- Chip "Nuevo" (estrella hueso).

**Descartados por el usuario:** titular con letras recortadas; **los arcanos del tarot, del todo** (ni en las fichas, ni en el detalle, ni en la base; decidido el 2026-09-19); las cajas "Barista" en la tienda y debajo del pentágono; el aviso grande "Todavía no está reservado"; el molino dibujado en SVG (va una foto real y quieta).

**Reglas fijas:** ángulos (placas -14°, botones -12°, menú -8°, cajas de diálogo -6°, ticker -1,6°); sombras duras de 4 a 9 px, nunca difusas; curva Persona `cubic-bezier(.2,1.2,.4,1)`; curva ambiental `cubic-bezier(.16,1,.3,1)`; respetar `prefers-reduced-motion`.

## 4. Estructura del sitio

1. **Home:** calendario + "Abierto ahora", "café de santoto", presentación, misión en caja de diálogo, tolva (origen, pentágono, tostadero Puerto Blest, foto del E65S), ticker inclinado. En el celular, la tolva es una **tarjeta chica** (pentágono sin etiquetas + botón "Llevate un cuarto") y el detalle se abre en una hoja que sube.
2. **Tienda:** dos carruseles que se mueven solos (Café / Kits y accesorios). Las fichas dicen "Pedir ›".
3. **Pedido por WhatsApp:** detalle → "Sumar al pedido" → "¡Sumado!" + barra "Tu pedido · N · sin confirmar" → "Tu pedido" con los pasos **1 Armás el pedido · 2 Lo confirmamos por WhatsApp · 3 Retirás en el local** → botón **"Enviar para confirmar"** → WhatsApp con el mensaje escrito → pantalla "Esperando confirmación".
4. **Dónde estamos:** horarios con la fila de hoy marcada, mapa, "Cómo llegar", **"Ver la carta ↗"** (va a `/carta`), "Escribir por DM".

**Falco FM (la playlist del local) quedó afuera** por decisión del usuario (2026-09-19). Quizás vuelva más adelante; no diseñarlo ni codearlo hasta que lo pida.

## 5. Decisiones técnicas

- **Proyecto 100 % independiente de `falco-app`** (el POS del local): repo, base y admin propios. No se usa su Supabase.
- **Todo en Cloudflare:** Astro con SSR en Workers, D1 como base, R2 para fotos, Cloudflare Access para el login del admin (código por mail).
- Monorepo: `apps/site`, `apps/admin`, `packages/db`, `packages/ui`.
- **Sin pagos.** Varios productos por pedido. **Solo retiro en el local.** Café **solo en grano** (falta que Falco lo confirme: el brief original decía "molido o en grano").
- **La carta es un PDF en Google Drive**, detrás de `falco.cafe/carta` con redirección **302** (no 301, para que los QR de las mesas sigan andando si cambia el link).
- "Abierto ahora" con la hora de **America/Argentina/Buenos_Aires**. Los wireframes usan la hora del dispositivo: eso NO va a producción.
- **Pedido en el navegador:** sin enviar vence a los 3 días; enviado, a las 48 horas. Máximo 2 unidades por producto (por stock). El mensaje arranca con "¡Buenas!". Borrarlo cuando Falco confirma la entrega queda para la fase 2 (pedidos guardados con estado).
- Métricas con **Umami** (sin cookies). Nunca se manda el nombre ni el comentario del pedido.
- Dominio: **`falco.cafe`** (falta verificar si está disponible) + `falcocafe.com.ar` que redirige (ARS 8.500 por año).
- Textos que ve el usuario en español; código, tablas y rutas en inglés.

## 6. Pendiente

**Contenido que tiene que pasar Falco:** logo en SVG, foto del E65S del local, fotos y precios de productos, número de WhatsApp, horarios reales y feriados, link del PDF de la carta, confirmar lo de "solo en grano", disponibilidad de `falco.cafe`, decidir si va el murciélago en la pantalla de carga.

**Próximo paso:** que el usuario apruebe `SCOPE.md` y después escribir **el plan de implementación** (tareas chicas, en orden y verificables, siguiendo la sección 12 de la spec). Después, empezar a codear.

## 7. Cómo trabajar con el usuario

- Responder en **español rioplatense** (voseo), con tono cálido y directo.
- **Cuando hacés una pregunta, frená y esperá la respuesta.** No sigas asumiendo.
- Verificá antes de afirmar algo técnico o de precios. Si el usuario se equivoca, explicá por qué con evidencia.
- Proponé alternativas con ventajas y desventajas cuando haya una decisión real.
- **Nunca toques lo que ya está aprobado sin dejar una copia antes.** Al usuario le importa poder volver atrás.
- Commits: conventional commits y **sin ninguna atribución de IA** (ni "Co-Authored-By").
- Le gusta **ver** las cosas: ante un cambio visual, mostrarlo en los wireframes en vez de describirlo.
- Prefiere la claridad por estructura y palabras, no por carteles grandes.
