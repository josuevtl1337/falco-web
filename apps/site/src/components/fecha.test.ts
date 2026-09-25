import { describe, expect, it } from "vitest";
import { WEEKDAY_LABELS, dayMoment } from "./fecha";

describe("dayMoment", () => {
  it("antes de las 6 es de noche", () => {
    expect(dayMoment(0)).toBe("NOCHE");
    expect(dayMoment(5 * 60 + 59)).toBe("NOCHE");
  });

  it("de 6 a 12 es de mañana", () => {
    expect(dayMoment(6 * 60)).toBe("MAÑANA");
    expect(dayMoment(11 * 60 + 59)).toBe("MAÑANA");
  });

  it("de 12 a 14 es mediodía", () => {
    expect(dayMoment(12 * 60)).toBe("MEDIODÍA");
    expect(dayMoment(13 * 60 + 59)).toBe("MEDIODÍA");
  });

  it("de 14 a 20 es de tarde", () => {
    expect(dayMoment(14 * 60)).toBe("TARDE");
    expect(dayMoment(19 * 60 + 59)).toBe("TARDE");
  });

  it("de 20 en adelante vuelve a ser de noche", () => {
    expect(dayMoment(20 * 60)).toBe("NOCHE");
    expect(dayMoment(23 * 60 + 59)).toBe("NOCHE");
  });
});

describe("WEEKDAY_LABELS", () => {
  it("tiene los siete días, arrancando en domingo", () => {
    expect(WEEKDAY_LABELS).toHaveLength(7);
    expect(WEEKDAY_LABELS[0]).toBe("DOM");
    expect(WEEKDAY_LABELS[1]).toBe("LUN");
    expect(WEEKDAY_LABELS[6]).toBe("SÁB");
  });
});
