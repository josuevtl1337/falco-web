import { describe, expect, it } from "vitest";
import { generateOrderCode, ORDER_CODE_PATTERN } from "./order-code";

describe("generateOrderCode", () => {
  it("usa el primer carácter del alfabeto cuando el azar da 0", () => {
    expect(generateOrderCode(() => 0)).toBe("F-2222");
  });

  it("usa el último carácter cuando el azar da casi 1", () => {
    expect(generateOrderCode(() => 0.9999)).toBe("F-ZZZZ");
  });

  it("siempre genera códigos con el formato F-XXXX sin caracteres confusos", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateOrderCode();
      expect(code).toMatch(ORDER_CODE_PATTERN);
      expect(code.slice(2)).not.toMatch(/[01OIL]/);
    }
  });
});
