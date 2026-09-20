import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("pasa a minúsculas, saca tildes y reemplaza espacios por guiones", () => {
    expect(slugify("Kit V60 completo")).toBe("kit-v60-completo");
    expect(slugify("Etiopía natural")).toBe("etiopia-natural");
  });

  it("saca signos y guiones repetidos o en los bordes", () => {
    expect(slugify("  Huila · Colombia!! ")).toBe("huila-colombia");
    expect(slugify("Filtros V60 · 02")).toBe("filtros-v60-02");
  });
});
