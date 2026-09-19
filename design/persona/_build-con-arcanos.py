"""Arma falco-persona.html a partir de falco-persona.src.html.

Inyecta el SVG del E65S desde ../Main.dc.html y genera las fichas de la tienda.
Uso: python3 build.py
"""
import re
from pathlib import Path

HERE = Path(__file__).parent
src = (HERE / "falco-persona.src.html").read_text()
main_src = (HERE.parent / "Main.dc.html").read_text()

# ---- E65S del diseño actual ----
i = main_src.index("MAHLKÖNIG E65S =====")
s = main_src.index("<svg", i)
e = main_src.index("</svg>", s) + 6
svg, n = re.subn(
    r'<svg\s+viewBox="0 0 240 560"\s+style="[^"]*"',
    '<svg class="e65s" viewBox="0 0 240 560" role="img" aria-label="Mahlkönig E65S moliendo"',
    main_src[s:e],
    count=1,
)
assert n == 1, "no encontré la etiqueta <svg> del E65S"

# ---- íconos de los arcanos ----
S = 'fill="none" stroke="#E8E2D0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'
ICONS = {
    "sun": f'<circle cx="32" cy="32" r="11" {S}/><path d="M32 8v8M32 48v8M8 32h8M48 32h8M15 15l6 6M43 43l6 6M49 15l-6 6M21 43l-6 6" {S}/>',
    "star": f'<path d="M32 6l5 18 18-5-13 13 13 13-18-5-5 18-5-18-18 5 13-13-13-13 18 5z" {S}/>',
    "moon": f'<path d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10z" {S}/>',
    "crown": f'<path d="M10 46l4-26 12 12 6-18 6 18 12-12 4 26z M10 52h44" {S}/>',
    "cup": f'<path d="M14 26h30v12a13 13 0 0 1-13 13h-4a13 13 0 0 1-13-13z M44 30h4a6 6 0 0 1 0 12h-5 M24 8c-3 4 3 7 0 11 M32 8c-3 4 3 7 0 11" {S}/>',
    "aero": f'<path d="M22 10h20v6H22z M24 16h16v34H24z M20 50h24v4H20z M28 24h8 M28 32h8 M28 40h8" {S}/>',
    "v60": f'<path d="M12 18h40L38 42H26z M26 42v6h12v-6 M18 54h28 M20 26l8 12 M44 26l-8 12" {S}/>',
    "lamp": f'<path d="M24 14h16l-2 8H26z M32 6v8 M26 22l-6 20h24l-6-20 M28 42v10h8V42 M22 56h20" {S}/>',
    "world": f'<circle cx="32" cy="32" r="20" {S}/><path d="M12 32h40 M32 12c-8 8-8 32 0 40 M32 12c8 8 8 32 0 40 M16 22h32 M16 42h32" {S}/>',
}


def icon(k):
    return f'<svg viewBox="0 0 64 64" aria-hidden="true">{ICONS[k]}</svg>'


# (número, arcano, ícono, producto, detalle, porqué, nuevo)
CAFE = [
    ("XIX", "El Sol", "sun", "[Huila] · Colombia", "250 g · en grano · durazno, panela",
     "Luminoso y dulce. El café para arrancar el día.", False),
    ("XVII", "La Estrella", "star", "[Etiopía] natural", "250 g · en grano · frutal, floral",
     "El que te cambia la idea de lo que es un café.", True),
    ("IV", "El Emperador", "crown", "Blend de casa", "500 g · en grano · el del local",
     "El de siempre. El que manda en la barra.", False),
    ("XVIII", "La Luna", "moon", "Descafeinado", "250 g · en grano · sin cafeína",
     "Para la noche. Todo el sabor, sin desvelo.", False),
]
KITS = [
    ("0", "El Loco", "cup", "Kit primer café", "Para arrancar de cero",
     "El arcano del que empieza sin saber nada. Como casi todos.", False),
    ("I", "El Mago", "aero", "Aeropress", "Con 100 filtros de papel",
     "Con poco hace mucho. Dos minutos y listo.", False),
    ("II", "La Sacerdotisa", "v60", "Kit V60 completo", "Cono, filtros, jarra y café",
     "Paciencia y ritual: el filtrado lento.", False),
    ("IX", "El Ermitaño", "lamp", "Filtros V60 · 02", "Caja de 100 · blancos",
     "Callado, siempre está. Sin él no hay filtrado.", False),
    ("XXI", "El Mundo", "world", "Remera Falco", "Algodón · S al XL",
     "Traer el mundo del café a Santo Tomé. Ponételo.", False),
]


def card(num, arc, ic, prod, detail, why, new, flip=False):
    burst = '<span class="burst">Nuevo</span>' if new else ""
    cls = "pc flip" if flip else "pc"
    return f'''<article class="{cls}" tabindex="0" aria-label="{prod}. Arcano {num}, {arc}. {why}">{burst}
          <div class="pc-in">
            <div class="pc-front">
              <div class="pc-shot"></div>
              <div class="pc-body">
                <span class="pc-code">{num} · {arc}</span>
                <span class="pc-name">{prod}</span>
                <span class="pc-sub">{detail}</span>
                <div class="pc-foot"><span>$ [00.000]</span><span class="pc-add">Pedir ›</span></div>
              </div>
            </div>
            <div class="pc-back" aria-hidden="true">
              <div class="arc-in">
                <div class="arc-top"><span class="arc-num">{num}</span><span class="arc-name">{arc}</span></div>
                <div class="arc-art">{icon(ic)}</div>
                <span class="arc-plate plate"><span>{prod}</span></span>
                <p class="pc-why">{why}</p>
                <span class="pc-add pc-add-back">Tocá para pedir ›</span>
              </div>
            </div>
          </div>
        </article>'''


def row(items, flip=None):
    # duplicada para que el carrusel dé la vuelta sin salto; `flip` = producto que se muestra dado vuelta
    one = "\n        ".join(card(*it, flip=(it[3] == flip)) for it in items)
    dup = "\n        ".join(card(*it) for it in items)
    return one + "\n        " + dup.replace('tabindex="0"', 'tabindex="-1"').replace("<article ", '<article aria-hidden="true" ')


def main():
    out = (
        src.replace("%%E65S%%", svg)
        .replace("%%ICON_MOON%%", icon("moon"))
        .replace("%%ROW1%%", row(CAFE))
        .replace("%%ROW2%%", row(KITS))
    )
    assert "%%" not in out, "quedó un marcador sin reemplazar"
    (HERE / "falco-persona.html").write_text(out)
    print("falco-persona.html:", len(out), "bytes")


if __name__ == "__main__":
    main()
