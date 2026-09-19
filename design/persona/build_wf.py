"""Arma wireframes.html (v7: La Cueva × Persona) a partir de wireframes.src.html.

Reusa las fichas de la tienda de build.py.
Foto del E65S: dejar `e65s.png` (o .jpg / .webp) en esta carpeta y volver a correr.
Uso: python3 build_wf.py
"""
import base64
from pathlib import Path

from build import CAFE, KITS, row

HERE = Path(__file__).parent

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
<div class="nav" style="height:70px; padding:0 22px"><div class="logo"><b style="font-size:32px">Falco</b></div><div class="burger"><span>Menú</span></div></div>"""

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

MAP = """<svg viewBox="0 0 660 500" preserveAspectRatio="xMidYMid slice" aria-label="Mapa de ejemplo: Falco en Iriondo 2153">
  <rect width="660" height="500" fill="#1E1F21"/>
  <g stroke="rgba(232,226,208,0.10)" stroke-width="1" fill="none"><path d="M0,90 L660,60 M0,190 L660,160 M0,392 L660,362 M0,470 L660,440 M120,0 L96,500 M400,0 L376,500 M540,0 L516,500"/></g>
  <g stroke="rgba(232,226,208,0.24)" stroke-width="2" fill="none"><path d="M0,292 L660,262 M268,0 L244,500"/></g>
  <g fill="rgba(59,37,25,0.55)"><rect x="130" y="200" width="100" height="76"/><rect x="286" y="196" width="86" height="72"/><rect x="130" y="292" width="100" height="88"/><rect x="286" y="286" width="86" height="88"/><rect x="418" y="188" width="92" height="76"/><rect x="418" y="280" width="92" height="86"/></g>
  <circle class="ping" cx="256" cy="278" r="70" fill="none" stroke="rgba(242,196,139,0.5)" stroke-width="1.5"/>
  <circle class="ping" cx="256" cy="278" r="70" fill="none" stroke="rgba(242,196,139,0.5)" stroke-width="1.5" style="animation-delay:1.2s"/>
  <circle class="ping" cx="256" cy="278" r="70" fill="none" stroke="rgba(242,196,139,0.5)" stroke-width="1.5" style="animation-delay:2.4s"/>
  <circle cx="256" cy="278" r="7" fill="#F2C48B"/>
  <g transform="translate(282 250) skewX(-14)"><rect width="92" height="24" fill="#885333"/></g>
  <text x="296" y="267" fill="#E8E2D0" font-family="Martian Mono, monospace" font-size="11" letter-spacing="2">FALCO</text>
</svg>"""

PLAY = '<div class="play"><svg viewBox="0 0 24 24" fill="#292A2C" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg></div>'




def main():
    src = (HERE / "wireframes.src.html").read_text()
    src = src.replace("%%PEDIDO%%", (HERE / "pedido.section.html").read_text())
    d_tienda = f"""<div class="glow" style="left:170px; top:-260px; width:1100px; height:640px"></div>
<div class="nav" style="height:92px; padding:0 72px"><div class="logo"><b>Falco</b><span>café de santoto</span></div>
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
        .replace("%%M_DLG%%", M_DLG)
        .replace("%%TICKER_TOLVA%%", TICKER_TOLVA)
        .replace("%%PENTA%%", PENTA)
        .replace("%%E65S%%", e65s())
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
