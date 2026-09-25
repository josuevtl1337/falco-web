import type { Coffee } from "@falco/db";
import { describe, expect, it } from "vitest";
import { originDetail, originLabel, placeLabel } from "./origen";

// Un café completo. Cada test le saca lo que quiere probar ausente, en lugar de
// armar uno distinto por caso: así se ve de un vistazo qué cambia.
const cafe = (cambios: Partial<Coffee> = {}): Coffee => ({
  id: 1,
  name: "Huila",
  farm: "Finca La Esperanza",
  country: "Colombia",
  variety: "Caturra",
  process: "Lavado",
  altitudeMasl: 1750,
  roaster: "Puerto Blest",
  profile: { acidity: 4, sweetness: 5, body: 2, aroma: 4, finish: 3 },
  ...cambios,
});

describe("placeLabel", () => {
  it("junta la región y el país", () => {
    expect(placeLabel(cafe())).toBe("Huila, Colombia");
  });

  it("sin región deja solo el país, sin la coma colgando", () => {
    expect(placeLabel(cafe({ name: "" }))).toBe("Colombia");
  });
});

describe("originLabel", () => {
  it("pone la finca adelante del lugar", () => {
    expect(originLabel(cafe())).toBe("Finca La Esperanza · Huila, Colombia");
  });

  // El separador suelto es el error clásico de armar estas líneas con
  // concatenación: sin finca la línea tiene que arrancar por el lugar.
  it("sin finca no deja el separador suelto adelante", () => {
    expect(originLabel(cafe({ farm: undefined }))).toBe("Huila, Colombia");
  });
});

describe("originDetail", () => {
  it("encadena variedad, proceso y altura", () => {
    expect(originDetail(cafe())).toBe("Caturra · Lavado · 1750 msnm");
  });

  it("saltea los datos que el café no tiene", () => {
    expect(originDetail(cafe({ process: undefined }))).toBe(
      "Caturra · 1750 msnm",
    );
  });

  it("sin ningún dato devuelve vacío, para que la línea no se muestre", () => {
    expect(
      originDetail(
        cafe({ variety: undefined, process: undefined, altitudeMasl: undefined }),
      ),
    ).toBe("");
  });

  // Una altura de 0 msnm no existe, pero un 0 que se cuela por un `||` en vez
  // de un chequeo explícito imprimiría "0 msnm" o lo borraría según el caso.
  it("una altura de cero no imprime la línea de altura", () => {
    expect(originDetail(cafe({ altitudeMasl: 0 }))).toBe("Caturra · Lavado");
  });
});
