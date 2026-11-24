import { describe, expect, it } from "vitest";
import { nombreSinPais, notasDe, origenDe, puntajeSca } from "./ficha-cafe";

describe("la línea de origen", () => {
  it("es el país y la región", () => {
    expect(origenDe({ country: "Colombia", name: "Huila" }, "Pink Bourbon")).toBe("Colombia · Huila");
  });

  it("no repite la región si ya está en el nombre, ni el país", () => {
    expect(origenDe({ country: "Guatemala", name: "Palo Blanco" }, "Guatemala Palo Blanco")).toBe("Guatemala");
    expect(origenDe({ country: "Etiopía", name: "Etiopia" }, "Oboleyan")).toBe("Etiopía");
  });
});

describe("el nombre sin el país", () => {
  it("lo saca del principio o del final", () => {
    expect(nombreSinPais("Colombia Pink Bourbon", "Colombia")).toBe("Pink Bourbon");
    expect(nombreSinPais("Pacamara Honey - Nicaragua", "Nicaragua")).toBe("Pacamara Honey");
    expect(nombreSinPais("Etiopía Oboleyan coffee", "Etiopía")).toBe("Oboleyan coffee");
    expect(nombreSinPais("Etiopia Oboleyan", "Etiopía")).toBe("Oboleyan");
  });

  it("si el nombre es sólo el país, o no lo lleva, queda igual", () => {
    expect(nombreSinPais("Colombia", "Colombia")).toBe("Colombia");
    expect(nombreSinPais("Huila · Colombia", "Brasil")).toBe("Huila · Colombia");
    expect(nombreSinPais("Colombiana especial", "Colombia")).toBe("Colombiana especial");
  });
});

describe("las notas", () => {
  it("separa por coma, punto medio o 'y', con mayúscula, hasta tres", () => {
    expect(notasDe("Cítricos, flores y uva verde.")).toEqual(["Cítricos", "Flores", "Uva verde"]);
    expect(notasDe("Jazmín · mandarina · pomelo · chocolate")).toEqual(["Jazmín", "Mandarina", "Pomelo"]);
    expect(notasDe(undefined)).toEqual([]);
    expect(notasDe("   ")).toEqual([]);
  });
});

describe("el puntaje SCA", () => {
  it("con coma decimal y sin ceros de más", () => {
    expect(puntajeSca(86.5)).toBe("86,5");
    expect(puntajeSca(87)).toBe("87");
  });
});
