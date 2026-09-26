import type { SpecialDay, WeekHours } from "@falco/domain";

/**
 * Lo que Google lee del sitio y la persona no ve: los datos del local en
 * JSON-LD y el sitemap. Todo sale de la base, igual que la home, así que un
 * horario cambiado en el admin también cambia acá.
 */

const DAY_URIS = [
  "https://schema.org/Sunday",
  "https://schema.org/Monday",
  "https://schema.org/Tuesday",
  "https://schema.org/Wednesday",
  "https://schema.org/Thursday",
  "https://schema.org/Friday",
  "https://schema.org/Saturday",
] as const;

type HoursSpec = {
  "@type": "OpeningHoursSpecification";
  dayOfWeek?: string[];
  validFrom?: string;
  validThrough?: string;
  opens: string;
  closes: string;
};

// La base guarda la medianoche de cierre como 24:00; schema.org espera una
// hora del día, y Google la documenta como 23:59.
const time = (value: string): string => (value === "24:00" ? "23:59" : value);

/**
 * Un bloque por tramo, con todos los días que abren en ese mismo tramo:
 * lunes a viernes de 8 a 12:30 es una entrada, no cinco. Los días especiales
 * van con su fecha; cerrado todo el día se dice 00:00 a 00:00.
 */
export function openingHours(
  week: WeekHours,
  specials: readonly SpecialDay[] = [],
): HoursSpec[] {
  const byShift = new Map<string, number[]>();
  for (let weekday = 0; weekday < 7; weekday++) {
    for (const shift of week[weekday]?.shifts ?? []) {
      const key = `${time(shift.opensAt)}-${time(shift.closesAt)}`;
      byShift.set(key, [...(byShift.get(key) ?? []), weekday]);
    }
  }

  const regular: HoursSpec[] = [...byShift].map(([key, days]) => {
    const [opens = "", closes = ""] = key.split("-");
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days.map((day) => DAY_URIS[day] ?? ""),
      opens,
      closes,
    };
  });

  const special: HoursSpec[] = specials.flatMap((day) => {
    const dated = { validFrom: day.date, validThrough: day.date };
    if (day.shifts.length === 0)
      return [
        {
          "@type": "OpeningHoursSpecification",
          ...dated,
          opens: "00:00",
          closes: "00:00",
        },
      ];
    return day.shifts.map((shift) => ({
      "@type": "OpeningHoursSpecification" as const,
      ...dated,
      opens: time(shift.opensAt),
      closes: time(shift.closesAt),
    }));
  });

  return [...regular, ...special];
}

export type CafeInfo = {
  site: URL;
  week: WeekHours;
  specials?: readonly SpecialDay[];
  instagramUrl?: string;
};

/** La ficha del local para Google: dirección, horarios, carta y redes. */
export function cafeJsonLd({ site, week, specials, instagramUrl }: CafeInfo) {
  return {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    "@id": new URL("/#local", site).toString(),
    name: "Falco",
    description: "Café de especialidad en Santo Tomé, Santa Fe.",
    url: new URL("/", site).toString(),
    image: new URL("/og.png", site).toString(),
    logo: new URL("/logo-falco.svg", site).toString(),
    hasMenu: new URL("/carta", site).toString(),
    servesCuisine: "Café de especialidad",
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Iriondo 2153",
      addressLocality: "Santo Tomé",
      addressRegion: "Santa Fe",
      postalCode: "3016",
      addressCountry: "AR",
    },
    openingHoursSpecification: openingHours(week, specials),
    ...(instagramUrl ? { sameAs: [instagramUrl] } : {}),
  };
}

/**
 * Para meter JSON dentro de un <script>: un "</script>" en un dato (un nombre
 * cargado en el admin) cerraría la etiqueta antes de tiempo.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

const escapeXml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** El sitemap: la home y cada producto visible, con su dirección absoluta. */
export function sitemapXml(site: URL, paths: readonly string[]): string {
  const urls = paths
    .map(
      (path) =>
        `  <url><loc>${escapeXml(new URL(path, site).toString())}</loc></url>`,
    )
    .join("\n");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    `${urls}\n` +
    "</urlset>\n"
  );
}
