import { describe, expect, it } from "vitest";
import { cacheHeaderFor } from "../src/middleware";

describe("la caché de las páginas", () => {
  it("las páginas se cachean 60 segundos en el borde", () => {
    expect(cacheHeaderFor("/")).toBe("public, max-age=0, s-maxage=60");
    expect(cacheHeaderFor("/tienda/prensa")).toBe(
      "public, max-age=0, s-maxage=60",
    );
  });

  it("la carta nunca se cachea", () => {
    expect(cacheHeaderFor("/carta")).toBe("no-store");
  });

  it("el 404 no se cachea, para que una página nueva se vea enseguida", () => {
    expect(cacheHeaderFor("/404")).toBe("no-store");
    // Una dirección inventada también responde 404, con otra ruta.
    expect(cacheHeaderFor("/una-ruta-inventada", 404)).toBe("no-store");
  });
});
