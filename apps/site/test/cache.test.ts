import { describe, expect, it } from "vitest";
import { apexRedirect, cacheHeaderFor } from "../src/middleware";

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

describe("www", () => {
  it("lleva al dominio sin www, con la misma ruta", () => {
    expect(apexRedirect(new URL("https://www.falcocafe.com.ar/tienda/prensa?x=1"))).toBe(
      "https://falcocafe.com.ar/tienda/prensa?x=1",
    );
  });

  it("el dominio sin www no se redirige", () => {
    expect(apexRedirect(new URL("https://falcocafe.com.ar/"))).toBeNull();
  });
});
