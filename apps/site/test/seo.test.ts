import { describe, expect, it } from "vitest";
import { cafeJsonLd, jsonForScript, openingHours, sitemapXml } from "../src/seo";

const site = new URL("https://falcocafe.com.ar");
const shift = (opensAt: string, closesAt: string) => ({ opensAt, closesAt });

describe("openingHours", () => {
  it("agrupa los días que abren en el mismo tramo", () => {
    const week = {
      0: { shifts: [] },
      1: { shifts: [shift("08:00", "12:30"), shift("16:30", "20:30")] },
      2: { shifts: [shift("08:00", "12:30"), shift("16:30", "20:30")] },
      6: { shifts: [shift("09:00", "24:00")] },
    };
    expect(openingHours(week)).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Tuesday"],
        opens: "08:00",
        closes: "12:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["https://schema.org/Monday", "https://schema.org/Tuesday"],
        opens: "16:30",
        closes: "20:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["https://schema.org/Saturday"],
        opens: "09:00",
        closes: "23:59",
      },
    ]);
  });

  it("un feriado cerrado va con su fecha y de 00:00 a 00:00", () => {
    const specials = [
      { date: "2026-10-12", shifts: [] },
      { date: "2026-12-24", shifts: [shift("08:00", "13:00")] },
    ];
    expect(openingHours({}, specials)).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        validFrom: "2026-10-12",
        validThrough: "2026-10-12",
        opens: "00:00",
        closes: "00:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        validFrom: "2026-12-24",
        validThrough: "2026-12-24",
        opens: "08:00",
        closes: "13:00",
      },
    ]);
  });
});

describe("cafeJsonLd", () => {
  it("lleva la dirección, la carta y el Instagram si está cargado", () => {
    const data = cafeJsonLd({ site, week: {}, instagramUrl: "https://www.instagram.com/falco.cafe/" });
    expect(data["@type"]).toBe("CafeOrCoffeeShop");
    expect(data.address.streetAddress).toBe("Iriondo 2153");
    expect(data.hasMenu).toBe("https://falcocafe.com.ar/carta");
    expect(data.sameAs).toEqual(["https://www.instagram.com/falco.cafe/"]);
    expect(cafeJsonLd({ site, week: {} })).not.toHaveProperty("sameAs");
  });
});

describe("jsonForScript", () => {
  it("no deja cerrar el <script> desde un dato", () => {
    const text = jsonForScript({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("</script>");
    expect(JSON.parse(text).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("sitemapXml", () => {
  it("lista direcciones absolutas y escapa el XML", () => {
    const xml = sitemapXml(site, ["/", "/tienda/cafe&leche"]);
    expect(xml).toContain("<loc>https://falcocafe.com.ar/</loc>");
    expect(xml).toContain("<loc>https://falcocafe.com.ar/tienda/cafe&amp;leche</loc>");
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
  });
});
