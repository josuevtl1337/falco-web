// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { clickEnElFondo, crearBloqueoDeScroll } from "./dialogo";

describe("crearBloqueoDeScroll", () => {
  let raiz: HTMLElement;

  beforeEach(() => {
    raiz = document.createElement("div");
  });

  it("bloquea el scroll al abrir el primero", () => {
    const bloqueo = crearBloqueoDeScroll(raiz);
    bloqueo.tomar();
    expect(raiz.style.overflow).toBe("hidden");
  });

  it("lo suelta al cerrar el único que había", () => {
    const bloqueo = crearBloqueoDeScroll(raiz);
    bloqueo.tomar();
    bloqueo.soltar();
    expect(raiz.style.overflow).toBe("");
  });

  // Éste es el bug que tenía el código anterior, con un manejo por diálogo:
  // cerrar la hoja desbloqueaba el scroll aunque el menú siguiera abierto, y
  // la página de atrás volvía a moverse debajo de un modal.
  it("con dos abiertos, cerrar uno NO desbloquea el scroll", () => {
    const bloqueo = crearBloqueoDeScroll(raiz);
    bloqueo.tomar();
    bloqueo.tomar();
    bloqueo.soltar();
    expect(bloqueo.abiertos).toBe(1);
    expect(raiz.style.overflow).toBe("hidden");
  });

  it("recién con el último cerrado vuelve el scroll", () => {
    const bloqueo = crearBloqueoDeScroll(raiz);
    bloqueo.tomar();
    bloqueo.tomar();
    bloqueo.soltar();
    bloqueo.soltar();
    expect(raiz.style.overflow).toBe("");
  });

  // Un "soltar" de más (un evento close duplicado) no puede dejar el contador
  // en negativo: si quedara en -1, el próximo "tomar" lo llevaría a 0 y el
  // siguiente cierre soltaría el candado con un diálogo todavía abierto.
  it("un cierre de más no deja el contador en negativo", () => {
    const bloqueo = crearBloqueoDeScroll(raiz);
    bloqueo.soltar();
    bloqueo.soltar();
    expect(bloqueo.abiertos).toBe(0);

    bloqueo.tomar();
    expect(bloqueo.abiertos).toBe(1);
    expect(raiz.style.overflow).toBe("hidden");
  });
});

describe("clickEnElFondo", () => {
  // La hoja del celular ocupa la franja de abajo: arriba de su borde está el
  // fondo, adentro está la hoja.
  const hoja = () => {
    const dialogo = document.createElement("dialog");
    dialogo.getBoundingClientRect = () =>
      ({ left: 0, right: 390, top: 400, bottom: 844 }) as DOMRect;
    return dialogo;
  };

  const click = (x: number, y: number, target: EventTarget) =>
    ({ clientX: x, clientY: y, target }) as unknown as MouseEvent;

  it("un click arriba de la hoja es el fondo", () => {
    const dialogo = hoja();
    expect(clickEnElFondo(dialogo, click(200, 100, dialogo))).toBe(true);
  });

  // El relleno del diálogo también tiene al <dialog> como objetivo: sin mirar
  // las coordenadas, tocar el borde interno de la hoja la cerraría.
  it("un click en el relleno de la hoja NO es el fondo", () => {
    const dialogo = hoja();
    expect(clickEnElFondo(dialogo, click(200, 500, dialogo))).toBe(false);
  });

  it("un click sobre el contenido tampoco lo es", () => {
    const dialogo = hoja();
    const boton = document.createElement("button");
    expect(clickEnElFondo(dialogo, click(200, 100, boton))).toBe(false);
  });
});
