import { describe, expect, it } from "vitest";
import { erroresDe, leerTramos, nombreDeFecha } from "./horarios";

const form = (pares: [string, string][]) => {
  const f = new FormData();
  for (const [k, v] of pares) f.append(k, v);
  return f;
};

describe("leer los tramos del formulario", () => {
  it("ignora las filas vacías y conserva el orden", () => {
    const f = form([
      ["d1-abre", "08:00"], ["d1-cierra", "12:30"],
      ["d1-abre", "16:30"], ["d1-cierra", "20:30"],
      ["d1-abre", ""], ["d1-cierra", ""],
    ]);
    expect(leerTramos(f, "d1")).toEqual([
      { opensAt: "08:00", closesAt: "12:30" },
      { opensAt: "16:30", closesAt: "20:30" },
    ]);
  });

  it("cerrar a las 00:00 es cerrar a la medianoche", () => {
    const f = form([["d5-abre", "20:00"], ["d5-cierra", "00:00"]]);
    expect(leerTramos(f, "d5")).toEqual([{ opensAt: "20:00", closesAt: "24:00" }]);
  });

  it("una fila a medias se manda igual, para que la validación diga qué falta", () => {
    const f = form([["d2-abre", "08:00"], ["d2-cierra", ""]]);
    expect(leerTramos(f, "d2")).toEqual([{ opensAt: "08:00", closesAt: "" }]);
  });
});

describe("los nombres y los errores", () => {
  it("nombra una fecha como la dice una persona", () => {
    expect(nombreDeFecha("2026-10-12")).toBe("Lunes 12/10");
  });

  it("junta los errores de un día sin mezclar el 1 con el 10", () => {
    const errores = { "1.shifts.0.closesAt": "a", "1": "b", "10.x": "c" };
    expect(erroresDe(errores, "1").sort()).toEqual(["a", "b"]);
  });
});
