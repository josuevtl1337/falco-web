"""Arma wireframes.html (v7: La Cueva × Persona) a partir de wireframes.src.html.

Reusa las fichas de la tienda de build.py.
Foto del E65S: dejar `e65s.png` (o .jpg / .webp) en esta carpeta y volver a correr.
Uso: python3 build_wf.py
"""
import base64
import re
from pathlib import Path

from build import CAFE, KITS, row

HERE = Path(__file__).parent
MARCA = HERE.parent / "marca"

# ---- el cartel: la cara del murciélago como neón, en cinco tubos ----
# Sale de ../marca/cara-linea.svg (la versión de línea, exportada de Illustrator):
# cada <path class="tubo tubo--x"> es un tubo con sus huecos, así cada uno se
# puede prender por su cuenta sin que cambie el dibujo.
_CARA = (MARCA / "cara-linea.svg").read_text()
CARA_VB = re.search(r'viewBox="([^"]+)"', _CARA).group(1)
CARA_TUBOS = "".join(re.findall(r"<path [^>]+/>", _CARA))
_TUBOS = re.findall(r'<path class="tubo tubo--(\w+)" d="([^"]+)"/>', _CARA)
# El dibujo va una sola vez en la página; cada cartel lo reusa con <use>.
CARA_DEFS = (
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>'
    + "".join(f'<path id="tubo-{k}" d="{d}"/>' for k, d in _TUBOS)
    + "</defs></svg>"
)
CARA_USES = "".join(f'<use class="tubo tubo--{k}" href="#tubo-{k}"/>' for k, _ in _TUBOS)
CARA_LLENA = (MARCA / "cara-llena.svg").read_text()


def cartel(alto, variante="a"):
    """El cartel de neón: los tubos apagados (vidrio) y encima los prendidos, que titilan al entrar."""
    svg = lambda cls: f'<svg class="{cls}" viewBox="{CARA_VB}" aria-hidden="true">{CARA_USES}</svg>'
    return (
        f'<span class="cartel cartel--{variante}" style="height:{alto}px" role="img" aria-label="Falco">'
        f'{svg("cartel__apagado")}{svg("cartel__prendido")}</span>'
    )

BAT = """<svg class="bat" viewBox="0 0 60 54" style="left:1128px; top:91px" aria-hidden="true">
  <g fill="#3a3c3e"><path d="M8,0 C4,14 6,26 14,32 C10,20 10,8 12,0 Z"/><path d="M52,0 C56,14 54,26 46,32 C50,20 50,8 48,0 Z"/>
  <ellipse cx="30" cy="26" rx="20" ry="19"/><path d="M18,44 C22,52 38,52 42,44 C36,49 24,49 18,44 Z"/></g>
  <g fill="#292a2c"><ellipse class="eye" cx="23" cy="24" rx="5" ry="7"/><ellipse class="eye" cx="37" cy="24" rx="5" ry="7"/></g>
</svg>"""

# ---- pentágono: queda dibujado en su forma final; el JS lo re-forma al entrar en pantalla ----
VALUES = [4, 5, 2, 4, 3]  # acidez, dulzor, cuerpo, aroma, final
FINAL = ["110,41", "186.1,80.3", "128.8,130.9", "72.4,156.8", "64.3,90.2"]
PENTA = f"""<svg class="penta" data-values="{','.join(map(str, VALUES))}" viewBox="-44 -12 308 214" role="img"
  aria-label="Perfil de cata: acidez 4, dulzor 5, cuerpo 2, aroma 4, final 3, sobre 5">
  <polygon class="grid" points="110,25 186.1,80.3 157,169.7 63,169.7 33.9,80.3"/>
  <polygon class="grid" points="110,65 148,92.6 133.5,137.4 86.5,137.4 72,92.6"/>
  <path class="grid" d="M110,105 L110,25 M110,105 L186.1,80.3 M110,105 L157,169.7 M110,105 L63,169.7 M110,105 L33.9,80.3"/>
  <polygon class="val" points="{' '.join(FINAL)}"/>
  {''.join(f'<circle class="vtx" r="3.5" cx="{p.split(",")[0]}" cy="{p.split(",")[1]}"/>' for p in FINAL)}
  <text x="110" y="12" text-anchor="middle">ACIDEZ <tspan data-num>4</tspan></text>
  <text x="196" y="74" text-anchor="start">DULZOR <tspan data-num>5</tspan></text>
  <text x="162" y="188" text-anchor="start">CUERPO <tspan data-num>2</tspan></text>
  <text x="58" y="188" text-anchor="end">AROMA <tspan data-num>4</tspan></text>
  <text x="24" y="74" text-anchor="end">FINAL <tspan data-num>3</tspan></text>
</svg>"""

PENTA_MINI = f"""<svg class="penta" data-values="{','.join(map(str, VALUES))}" viewBox="26 20 168 154" role="img"
  aria-label="Perfil de cata: acidez 4, dulzor 5, cuerpo 2, aroma 4, final 3, sobre 5">
  <polygon class="grid" points="110,25 186.1,80.3 157,169.7 63,169.7 33.9,80.3"/>
  <path class="grid" d="M110,105 L110,25 M110,105 L186.1,80.3 M110,105 L157,169.7 M110,105 L63,169.7 M110,105 L33.9,80.3"/>
  <polygon class="val" points="{' '.join(FINAL)}"/>
  {''.join(f'<circle class="vtx" r="4" cx="{p.split(",")[0]}" cy="{p.split(",")[1]}"/>' for p in FINAL)}
</svg>"""

M_TOP = """<div class="glow" style="left:-60px; top:-200px; width:520px; height:520px"></div>
<div class="nav" style="height:70px; padding:0 22px"><a class="logo logo--cartel" href="#v-home" aria-label="Falco, al inicio">%%CARTEL_M%%</a><div class="logo logo--centro"><b style="font-size:32px">Falco</b></div><div class="burger"><span>Menú</span></div></div>"""

M_DLG = """<div class="dlg sm">
  <span class="dlg-tag plate hi"><span>Falco</span></span>
  <div class="dlg-box"><p class="dlg-text" style="font-size:16px">Nuestra misión siempre fue la misma: traer el mundo del café a Santo Tomé.</p><span class="dlg-next">▼</span></div>
</div>"""

TICKER_TOLVA = (
    "<span>En tolva <b>[Huila, Colombia]</b> ◆ Tostadero <b>Puerto Blest</b> ◆ "
    "Dulzor <b>5</b> · Acidez <b>4</b> · Cuerpo <b>2</b> ◆</span>"
)


# ---------------- pedido por WhatsApp ----------------
def qty(n):
    return (f'<span class="qty"><span class="qty-b" aria-label="Menos">−</span><b>{n}</b>'
            '<span class="qty-b" aria-label="Más">+</span></span>')


ORDER = [  # (cantidad, producto, detalle)
    (1, "[Huila] · Colombia", "250 g · en grano"),
    (2, "Filtros V60 · 02", "Caja de 100"),
    (1, "Remera Falco", "Talle M"),
]
ITEMS = "".join(
    f'<div class="item"><div class="item-main"><b>{name}</b><small>{det}</small><i>$ [00.000]</i></div>'
    f'{qty(n)}<span class="item-x" aria-label="Quitar">✕</span></div>'
    for n, name, det in ORDER
)

MSG_LINES = (
    ["¡Buenas! Soy Sofía y quiero hacer este pedido (F-7K2Q):", ""]
    + [f"• {n} × {name.replace('[', '').replace(']', '')} · {det.lower()}" for n, name, det in ORDER]
    + ["", "Total estimado: $ [00.000]", "Lo retiraría en el local cuando me confirmen.", "Comentario: paso a la tarde.", "", "¿Me confirman si hay stock y desde qué hora lo puedo retirar?"]
)
MSG_RAW = "\n".join(MSG_LINES)
MSG = "<br>".join(MSG_LINES)

WA_ICON = ('<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true">'
           '<path d="M4 20l1.4-4.2A8 8 0 1 1 8.2 18.6z"/></svg>')
SEND_ICON = '<svg viewBox="0 0 24 24" fill="#292A2C" aria-hidden="true"><path d="M3 20l18-8L3 4v6l12 2-12 2z"/></svg>'
WA_HEAD = ('<div class="wa-head"><span aria-hidden="true">‹</span><span class="wa-av">F</span>'
           '<span><b>Falco · café de santoto</b><small>WhatsApp · ilustrativo</small></span></div>')

FAB = """<div class="pbar fab" style="left:auto; width:340px">
  <span class="pbar-n">3</span><span class="pbar-t"><b>Tu pedido</b><small>3 productos · sin confirmar</small></span>
  <span class="pbar-go">Ver ›</span>
</div>"""


def steps(stage):
    """stage 1: armando el pedido · stage 2: enviado, esperando confirmación."""
    cls = ["now", "gate", ""] if stage == 1 else ["done", "now gate", ""]
    labels = ["Armás el pedido", "Lo confirmamos por WhatsApp", "Retirás en el local"]
    lis = "".join(f'<li class="{c}"><b>{n}</b><span>{t}</span></li>' for n, (c, t) in enumerate(zip(cls, labels), 1))
    return f'<ol class="steps" aria-label="Cómo sigue tu pedido">{lis}</ol>'


AVISO = """<div class="aviso" role="note" data-hud-lite>
  <b>Todavía no está reservado</b>
  <p>Primero te confirmamos el stock y el horario por WhatsApp. No vengas a retirar hasta tener nuestra respuesta.</p>
  <small data-reply>Respondemos en el horario del local, normalmente en unos minutos.</small>
</div>"""

ITEMS_RO = "".join(f'<div class="ro"><span>{n} ×</span>{name}<small>{det}</small></div>' for n, name, det in ORDER)


def hud(small=False, addr=False):
    cls = "hud sm" if small else "hud"
    est = "estado sm on" if small else "estado on"
    addr_html = '<div class="hud-addr">Iriondo 2153 · Santo Tomé, Santa Fe</div>' if addr else ""
    return f"""<div class="{cls}" data-hud>
  <div class="hud-date"><span class="dd"><span class="old" data-d-old>17</span><span class="new" data-d>18</span></span><span class="mm">/<span data-m>9</span></span></div>
  <div class="hud-wd"><span class="plate hi"><span data-wd>JUE</span></span></div>
  <div class="hud-tod" data-tod>Tarde</div>
  <div class="{est}" data-estado><span class="dot"></span><b data-state>Abierto ahora</b><small data-state-sub>cierra 20:00</small></div>
  {addr_html}
</div>"""


def e65s():
    for ext, mime in (("png", "image/png"), ("jpg", "image/jpeg"), ("jpeg", "image/jpeg"), ("webp", "image/webp")):
        f = HERE / f"e65s.{ext}"
        if f.exists():
            data = base64.b64encode(f.read_bytes()).decode()
            return (f'<figure class="e65s"><img src="data:{mime};base64,{data}" alt="El Mahlkönig E65S de Falco">'
                    "<figcaption>Mahlkönig E65S</figcaption></figure>")
    return ('<figure class="e65s"><div class="e65s-slot"><b>Foto del E65S</b>'
            "<span>La del local · recortada · fondo transparente</span></div>"
            "<figcaption>Mahlkönig E65S</figcaption></figure>")


def _granos(n, ancho, alto, semilla):
    """Granos de café tostado en primer plano: elipses con la raya del medio."""
    import random
    r = random.Random(semilla)
    out = []
    for _ in range(n):
        x, y = r.uniform(-20, ancho + 20), r.uniform(alto * 0.62, alto + 10)
        e = 0.55 + (y - alto * 0.62) / (alto * 0.5)          # más cerca, más grande
        rx, ry, a = 17 * e, 12 * e, r.uniform(0, 180)
        tono = r.choice(["#3b2519", "#4a2e1d", "#2e1c13", "#553522"])
        out.append(
            f'<g transform="translate({x:.0f} {y:.0f}) rotate({a:.0f})">'
            f'<ellipse rx="{rx:.1f}" ry="{ry:.1f}" fill="{tono}"/>'
            f'<ellipse rx="{rx*0.8:.1f}" ry="{ry*0.55:.1f}" cx="{-rx*0.15:.1f}" cy="{-ry*0.25:.1f}" fill="#f2c48b" opacity=".10"/>'
            f'<path d="M{-rx*0.75:.1f} 0 Q0 {ry*0.35:.1f} {rx*0.75:.1f} 0" stroke="#1a100a" stroke-width="{1.6*e:.1f}" fill="none"/></g>'
        )
    return "".join(out)


def fondo_tolva(ancho=720, alto=520, semilla=7):
    """La foto de fondo de "En tolva ahora": la tolva del E65S con granos adelante.

    Si está design/persona/tolva-fondo.(jpg|webp|png), usa esa foto. Si no, un
    dibujo que la reemplaza con la misma composición: la tolva desenfocada a la
    derecha y los granos nítidos abajo.
    """
    # Primero el video (un molino moliendo, en loop), con su primer cuadro de
    # póster. En la tarjeta chica del celular va sólo el póster: sin datos de más.
    video, poster = HERE / "tolva-fondo.mp4", HERE / "tolva-fondo-poster.jpg"
    if video.exists() and poster.exists():
        p64 = base64.b64encode(poster.read_bytes()).decode()
        if ancho < 480:
            return f'<div class="t-fondo"><img src="data:image/jpeg;base64,{p64}" alt=""></div>'
        v64 = base64.b64encode(video.read_bytes()).decode()
        webm = HERE / "tolva-fondo.webm"
        w = f'<source src="data:video/webm;base64,{base64.b64encode(webm.read_bytes()).decode()}" type="video/webm">' if webm.exists() else ""
        return (
            '<div class="t-fondo">'
            f'<video data-tolva-video muted loop playsinline preload="auto" poster="data:image/jpeg;base64,{p64}">'
            f'{w}<source src="data:video/mp4;base64,{v64}" type="video/mp4"></video>'
            '<span class="t-fondo-tag">Video de muestra · molino moliendo (Coverr)</span></div>'
        )
    for ext, mime in (("jpg", "image/jpeg"), ("jpeg", "image/jpeg"), ("webp", "image/webp"), ("png", "image/png")):
        f = HERE / f"tolva-fondo.{ext}"
        if f.exists():
            data = base64.b64encode(f.read_bytes()).decode()
            return f'<div class="t-fondo"><img src="data:{mime};base64,{data}" alt=""></div>'
    svg = f"""<svg viewBox="0 0 {ancho} {alto}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="tf-luz" cx="74%" cy="22%" r="65%"><stop offset="0" stop-color="#b98458"/><stop offset=".5" stop-color="#4a3424"/><stop offset="1" stop-color="#1c1a19"/></radialGradient>
    <linearGradient id="tf-vidrio" x1="0" x2="1"><stop offset="0" stop-color="#e8e2d0" stop-opacity=".25"/><stop offset=".25" stop-color="#fff6e6" stop-opacity=".6"/><stop offset=".5" stop-color="#e8e2d0" stop-opacity=".15"/><stop offset=".85" stop-color="#fff6e6" stop-opacity=".45"/><stop offset="1" stop-color="#e8e2d0" stop-opacity=".2"/></linearGradient>
    <filter id="tf-lejos"><feGaussianBlur stdDeviation="3.5"/></filter>
    <filter id="tf-cerca"><feGaussianBlur stdDeviation=".6"/></filter>
  </defs>
  <rect width="{ancho}" height="{alto}" fill="url(#tf-luz)"/>
  <g filter="url(#tf-lejos)">
    <!-- la tolva: tapa, vidrio con granos adentro, cuello y el cuerpo del molino -->
    <rect x="{ancho*0.56:.0f}" y="-10" width="{ancho*0.36:.0f}" height="30" rx="6" fill="#141414"/>
    <path d="M{ancho*0.55:.0f} 18 L{ancho*0.93:.0f} 18 L{ancho*0.8:.0f} {alto*0.42:.0f} L{ancho*0.68:.0f} {alto*0.42:.0f} Z" fill="url(#tf-vidrio)" stroke="#e8e2d0" stroke-opacity=".35" stroke-width="2"/>
    <path d="M{ancho*0.585:.0f} {alto*0.12:.0f} L{ancho*0.9:.0f} {alto*0.12:.0f} L{ancho*0.8:.0f} {alto*0.42:.0f} L{ancho*0.68:.0f} {alto*0.42:.0f} Z" fill="#6b4128" opacity=".95"/>
    <rect x="{ancho*0.67:.0f}" y="{alto*0.42:.0f}" width="{ancho*0.14:.0f}" height="{alto*0.1:.0f}" fill="#1a1a1a"/>
    <rect x="{ancho*0.56:.0f}" y="{alto*0.51:.0f}" width="{ancho*0.38:.0f}" height="{alto*0.5:.0f}" rx="10" fill="#202020"/>
  </g>
  <g filter="url(#tf-cerca)">{_granos(170, ancho, alto, semilla)}</g>
</svg>"""
    return f'<div class="t-fondo">{svg}<span class="t-fondo-tag">Foto real · tolva del E65S con granos adelante</span></div>'


def vitrina():
    """El paquete del café en tolva, como hoy en el sitio (Vitrina.astro)."""
    f = HERE.parent / "marca" / "paquete-ejemplo.png"
    if f.exists():
        data = base64.b64encode(f.read_bytes()).decode()
        return (f'<figure class="vitrina-wf"><img src="data:image/png;base64,{data}" alt="">'
                "<figcaption>El paquete · gira en la vitrina</figcaption></figure>")
    return '<figure class="vitrina-wf"><div class="e65s-slot"><b>El paquete</b><span>Foto del café en tolva</span></div></figure>'


HOY = '<span class="plate hoy-tag"><span>Hoy</span></span>'
ROWS = f"""<div class="rows">
  <div data-days="1,2,3,4,5,6"><span class="k">Lunes a sábado {HOY}</span><span class="v">[08:00] — [20:00]</span></div>
  <div data-days="0"><span class="k">Domingo {HOY}</span><span class="v">[15:00] — [20:00]</span></div>
  <div><span class="k">Tostadero</span><span class="v">Puerto Blest</span></div>
</div>"""
ROWS_M = f"""<div class="rows">
  <div data-days="1,2,3,4,5,6"><span class="k">Lun a sáb {HOY}</span><span class="v">[08:00] — [20:00]</span></div>
  <div data-days="0"><span class="k">Domingo {HOY}</span><span class="v">[15:00] — [20:00]</span></div>
</div>"""

TICKER = (
    "<span>En tolva <b>[Huila, Colombia]</b> ◆ Tostadero <b>Puerto Blest</b> ◆ Molemos en "
    "<b>Mahlkönig E65S</b> ◆ Iriondo 2153 · Santo Tomé ◆</span>"
)

# Falco a mitad de cuadra sobre Iriondo, en la vereda este, entre 9 de Julio y la
# Av. 7 de Marzo (la calle que todos conocen). Norte arriba; Iriondo se inclina
# con skewX como en el plano real. El cartel usa textLength para no depender del
# ancho de la fuente.
MAP = """<svg viewBox="0 0 660 500" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa: Falco en Iriondo 2153, a mitad de cuadra entre 9 de Julio y la Av. 7 de Marzo">
  <rect width="660" height="500" fill="#1E1F21"/>
  <g transform="matrix(1 0 -0.144 1 0 0)" fill="none">
  <rect x="40" y="0" width="90" height="70" fill="rgba(59,37,25,0.5)"/><rect x="150" y="10" width="70" height="62" fill="rgba(59,37,25,0.5)"/><rect x="240" y="0" width="110" height="72" fill="rgba(59,37,25,0.5)"/><rect x="392" y="4" width="80" height="64" fill="rgba(59,37,25,0.5)"/><rect x="486" y="0" width="100" height="70" fill="rgba(59,37,25,0.5)"/><rect x="660" y="8" width="90" height="60" fill="rgba(59,37,25,0.5)"/><rect x="180" y="132" width="80" height="60" fill="rgba(59,37,25,0.5)"/><rect x="268" y="130" width="84" height="70" fill="rgba(59,37,25,0.5)"/><rect x="180" y="206" width="80" height="70" fill="rgba(59,37,25,0.5)"/><rect x="268" y="210" width="84" height="56" fill="rgba(59,37,25,0.5)"/><rect x="268" y="276" width="84" height="92" fill="rgba(59,37,25,0.5)"/><rect x="180" y="290" width="80" height="74" fill="rgba(59,37,25,0.5)"/><rect x="0" y="140" width="96" height="90" fill="rgba(59,37,25,0.5)"/><rect x="0" y="250" width="96" height="110" fill="rgba(59,37,25,0.5)"/><rect x="396" y="130" width="58" height="94" fill="rgba(59,37,25,0.5)"/><rect x="462" y="134" width="48" height="86" fill="rgba(59,37,25,0.5)"/><rect x="396" y="274" width="70" height="88" fill="rgba(59,37,25,0.5)"/><rect x="476" y="282" width="80" height="74" fill="rgba(59,37,25,0.5)"/><rect x="576" y="236" width="60" height="110" fill="rgba(59,37,25,0.5)"/><rect x="520" y="126" width="100" height="90" fill="rgba(59,37,25,0.5)"/><rect x="660" y="120" width="90" height="110" fill="rgba(59,37,25,0.5)"/><rect x="660" y="250" width="90" height="110" fill="rgba(59,37,25,0.5)"/><rect x="0" y="440" width="96" height="70" fill="rgba(59,37,25,0.5)"/><rect x="180" y="430" width="90" height="80" fill="rgba(59,37,25,0.5)"/><rect x="280" y="436" width="72" height="70" fill="rgba(59,37,25,0.5)"/><rect x="392" y="444" width="90" height="60" fill="rgba(59,37,25,0.5)"/><rect x="500" y="440" width="110" height="70" fill="rgba(59,37,25,0.5)"/><rect x="660" y="452" width="90" height="60" fill="rgba(59,37,25,0.5)"/>
  <rect x="392" y="232" width="84" height="32" fill="#885333"/>
  <path d="M120,-20 L120,540" stroke="#313335" stroke-width="12"/><path d="M640,-20 L640,540" stroke="#313335" stroke-width="12"/>
  <path d="M-120,384 L780,424" stroke="#313335" stroke-width="16"/>
  <path d="M372,-20 L372,540" stroke="#313335" stroke-width="18"/>
  <path d="M363,-20 L363,540 M381,-20 L381,540" stroke="#E8E2D0" stroke-opacity="0.22" stroke-width="1"/>
  <path d="M-120,113 L780,89" stroke="#313335" stroke-width="30"/>
  <path d="M-120,98 L780,74 M-120,128 L780,104" stroke="#F2C48B" stroke-opacity="0.75" stroke-width="1.5"/>
  <path class="ruta" d="M386,124 L386,240" stroke="#F2C48B" stroke-width="3" stroke-dasharray="6 4" stroke-linecap="round"/>
  </g>
  <text x="44.4" y="112.2" transform="rotate(-1.5 44.4 108.2)" fill="#F2C48B" font-family="Martian Mono, monospace" font-size="11" letter-spacing="3">AV. 7 DE MARZO</text>
  <text x="466" y="101" transform="rotate(-1.5 466 97)" fill="#F2C48B" font-family="Martian Mono, monospace" font-size="11" letter-spacing="3">AV. 7 DE MARZO</text>
  <text x="339.4" y="410.5" transform="rotate(2.5 339.4 407)" fill="#9A9C9E" font-family="Martian Mono, monospace" font-size="9" letter-spacing="2">9 DE JULIO</text>
  <text x="302.4" y="372" transform="rotate(-81.8 302.4 372)" fill="#9A9C9E" font-family="Martian Mono, monospace" font-size="9" letter-spacing="2">IRIONDO</text>
  <g transform="translate(120 146) skewX(-12)"><rect width="226" height="26" fill="#1E1F21" stroke="#F2C48B" stroke-width="1"/></g>
  <text x="136" y="163" textLength="194" lengthAdjust="spacingAndGlyphs" fill="#F2C48B" font-family="Martian Mono, monospace" font-size="9" letter-spacing="1">A MEDIA CUADRA DE LA 7 DE MARZO</text>
  <path d="M342,159 L354,159" stroke="#F2C48B" stroke-width="1"/>
  <g transform="translate(620 150)"><circle r="15" fill="#1E1F21" stroke="rgba(232,226,208,0.3)"/>
  <path d="M0,-9 L5,4 L0,1 L-5,4 Z" fill="#E8E2D0"/><text y="-18" text-anchor="middle" fill="#9A9C9E" font-family="Martian Mono, monospace" font-size="9">N</text></g>
  <circle class="ping" cx="350.3" cy="248" r="64" fill="none" stroke="rgba(242,196,139,0.5)" stroke-width="1.5"/>
  <circle class="ping" cx="350.3" cy="248" r="64" fill="none" stroke="rgba(242,196,139,0.5)" stroke-width="1.5" style="animation-delay:1.2s"/>
  <circle class="ping" cx="350.3" cy="248" r="64" fill="none" stroke="rgba(242,196,139,0.5)" stroke-width="1.5" style="animation-delay:2.4s"/>
  <circle cx="350.3" cy="248" r="7" fill="#F2C48B" stroke="#1E1F21" stroke-width="2"/>
  <text x="398.3" y="252" text-anchor="middle" fill="#E8E2D0" font-family="Martian Mono, monospace" font-size="11" letter-spacing="2">FALCO</text>
  </svg>"""

PLAY = '<div class="play"><svg viewBox="0 0 24 24" fill="#292A2C" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></div>'




def main():
    src = (HERE / "wireframes.src.html").read_text()
    src = src.replace("%%PEDIDO%%", (HERE / "pedido.section.html").read_text())
    d_tienda = f"""<div class="glow" style="left:170px; top:-260px; width:1100px; height:640px"></div>
<div class="nav" style="height:92px; padding:0 72px"><a class="logo logo--cartel" href="#v-home" aria-label="Falco, al inicio">%%CARTEL_D%%</a><div class="logo logo--centro"><b>Falco</b><span>café de santoto</span></div>
<nav><a href="#v-tienda" class="on">La tienda</a><a href="#v-donde">Dónde estamos</a><a class="ig" href="#v-home">@falco.cafe</a></nav></div>
<div style="display:grid; gap:18px; padding:60px 72px 20px"><div><span class="plate hi"><span>La tienda</span></span></div>
<div class="h-lg">Llevate Falco a casa</div></div>
<div style="padding:10px 72px 0"><div class="shop-row"><span class="lbl">Café</span><i></i></div></div>
<div class="rail"><div class="track to-l" style="padding-left:72px">{row(CAFE)}</div></div>
{FAB}"""
    out = (
        src.replace("%%BAT%%", BAT)
        .replace("%%D_TIENDA%%", d_tienda)
        .replace("%%STEPS_1%%", steps(1))
        .replace("%%STEPS_2%%", steps(2))
        .replace("%%AVISO%%", AVISO)
        .replace("%%ITEMS_RO%%", ITEMS_RO)
        .replace("%%ITEMS%%", ITEMS)
        .replace("%%QTY1%%", qty(1))
        .replace("%%MSG_RAW%%", MSG_RAW)
        .replace("%%MSG%%", MSG)
        .replace("%%WA_HEAD%%", WA_HEAD)
        .replace("%%WA_ICON%%", WA_ICON)
        .replace("%%SEND_ICON%%", SEND_ICON)
        .replace("%%PENTA_MINI%%", PENTA_MINI)
        .replace("%%M_TOP%%", M_TOP)
        .replace("%%CARTEL_M%%", cartel(70))
        .replace("%%CARTEL_D%%", cartel(104))
        .replace("%%CARTEL_A%%", cartel(150, "a"))
        .replace("%%CARTEL_B%%", cartel(150, "b"))
        .replace("%%CARTEL_C%%", cartel(150, "c"))
        .replace("%%CARA_LLENA%%", CARA_LLENA)
        .replace("%%CARA_TUBOS%%", CARA_USES)
        .replace("%%CARA_DEFS%%", CARA_DEFS)
        .replace("%%M_DLG%%", M_DLG)
        .replace("%%TICKER_TOLVA%%", TICKER_TOLVA)
        .replace("%%PENTA%%", PENTA)
        .replace("%%E65S%%", e65s())
        .replace("%%FONDO_TOLVA%%", fondo_tolva(525, 610, 7))
        .replace("%%FONDO_TOLVA_M%%", fondo_tolva(400, 240, 3))
        .replace("%%VITRINA%%", vitrina())
        .replace("%%HUD_ADDR%%", hud(addr=True))
        .replace("%%HUD_SM%%", hud(small=True))
        .replace("%%ROWS_M%%", ROWS_M)
        .replace("%%ROWS%%", ROWS)
        .replace("%%TICKER%%", TICKER)
        .replace("%%MAP%%", MAP)
        .replace("%%FM_D%%", "")
        .replace("%%FM_M%%", "")
        .replace("%%ROW_CAFE%%", row(CAFE))
        .replace("%%ROW_KITS%%", row(KITS))
    )
    assert "%%" not in out, "quedó un marcador sin reemplazar"
    (HERE / "wireframes.html").write_text(out)
    photo = "con foto" if "data:image" in out else "sin foto (lugar marcado)"
    print(f"wireframes.html: {len(out)} bytes · E65S {photo}")


if __name__ == "__main__":
    main()
