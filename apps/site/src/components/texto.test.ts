import { describe, expect, it } from "vitest";
import { bloques, partes, textoPlano } from "./texto";

describe("la descripción con formato", () => {
  it("cada renglón es un párrafo y los renglones vacíos no cuentan", () => {
    expect(bloques("Uno\n\nDos\r\nTres")).toEqual([
      { tipo: "parrafo", partes: [{ texto: "Uno", negrita: false }] },
      { tipo: "parrafo", partes: [{ texto: "Dos", negrita: false }] },
      { tipo: "parrafo", partes: [{ texto: "Tres", negrita: false }] },
    ]);
  });

  it("los renglones con guion, asterisco o viñeta seguidos son una sola lista", () => {
    const b = bloques("¿Qué incluye?\n- Dripper\n* Server\n• Filtros\nCierre");
    expect(b.map((x) => x.tipo)).toEqual(["parrafo", "lista", "parrafo"]);
    const lista = b[1];
    expect(lista?.tipo === "lista" && lista.items.map((i) => i[0]?.texto)).toEqual(["Dripper", "Server", "Filtros"]);
  });

  it("**negrita** en cualquier parte del renglón", () => {
    expect(partes("**Control total**: personalizá")).toEqual([
      { texto: "Control total", negrita: true },
      { texto: ": personalizá", negrita: false },
    ]);
    expect(partes("sin cerrar **esto")).toEqual([{ texto: "sin cerrar **esto", negrita: false }]);
  });

  it("un guion dentro del texto no es una lista", () => {
    expect(bloques("V60 - tamaño 01")[0]?.tipo).toBe("parrafo");
  });

  it("lo que se escribe no se vuelve HTML: queda como texto", () => {
    expect(partes("<script>alert(1)</script>")[0]?.texto).toBe("<script>alert(1)</script>");
  });

  it("en una línea y sin marcas para Google, con tope", () => {
    expect(textoPlano("Hola\n- **uno**\n- dos")).toBe("Hola uno dos");
    expect(textoPlano("a".repeat(200), 20)).toHaveLength(20);
  });
});
