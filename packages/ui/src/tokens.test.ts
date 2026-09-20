import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  angles,
  colors,
  duration,
  easing,
  fonts,
  radius,
  space,
  text,
  touch,
} from "./tokens";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function cssValue(name: string): string | undefined {
  const match = new RegExp(`--${name}:\\s*([^;]+);`).exec(css);
  return match?.[1]?.trim();
}

describe("tokens.css coincide con tokens.ts", () => {
  it.each(Object.entries(colors))("color %s", (name, value) => {
    expect(cssValue(`color-${name}`)?.toLowerCase()).toBe(value.toLowerCase());
  });

  it.each(Object.entries(angles))("ángulo %s", (name, value) => {
    expect(cssValue(`angle-${name}`)).toBe(`${value}deg`);
  });

  it.each(Object.entries(easing))("curva %s", (name, value) => {
    expect(cssValue(`ease-${name}`)).toBe(value);
  });

  it.each(Object.entries(fonts))("tipografía %s", (name, value) => {
    expect(cssValue(`font-${name}`)).toBe(value);
  });
});

describe("paleta", () => {
  it("son exactamente los 7 colores del sistema, sin rojo", () => {
    expect(Object.keys(colors)).toEqual([
      "carbon",
      "piedra",
      "sombra",
      "tostado",
      "hueso",
      "ceniza",
      "brasa",
    ]);
  });
});

describe("escalas", () => {
  it("el área táctil mínima es de 44 px", () => {
    expect(touch.min).toBe("44px");
  });

  it("cada escala tiene su propiedad CSS con el mismo valor", () => {
    // Una escala que no se recorra acá puede desincronizarse sin que nadie se entere:
    // este test existe justamente para que eso no pase.
    const scales: [string, Record<string, string>][] = [
      ["space", space],
      ["text", text],
      ["radius", radius],
      ["duration", duration],
      ["touch", touch],
    ];
    for (const [prefix, scale] of scales) {
      const entries = Object.entries(scale);
      expect(entries.length).toBeGreaterThan(0);
      for (const [name, value] of entries)
        expect(cssValue(`${prefix}-${name}`)).toBe(value);
    }
  });
});
