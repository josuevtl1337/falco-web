import { describe, expect, it } from "vitest";
import {
  coffeeInputSchema,
  dayHoursSchema,
  productInputSchema,
  settingsSchema,
  specialDaySchema,
  timeSchema,
  weekHoursSchema,
} from "./schemas";

const firstError = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => (result.success ? undefined : result.error?.issues[0]?.message);

describe("timeSchema", () => {
  it("acepta HH:MM y 24:00", () => {
    expect(timeSchema.safeParse("08:00").success).toBe(true);
    expect(timeSchema.safeParse("24:00").success).toBe(true);
  });

  it("rechaza otros formatos con un mensaje claro", () => {
    expect(firstError(timeSchema.safeParse("8:00"))).toBe(
      "Usá el formato HH:MM, por ejemplo 08:30.",
    );
  });
});

describe("dayHoursSchema", () => {
  it("un día cerrado no necesita horas", () => {
    expect(
      dayHoursSchema.safeParse({
        isClosed: true,
        opensAt: null,
        closesAt: null,
      }).success,
    ).toBe(true);
  });

  it("un día abierto necesita las dos horas", () => {
    expect(
      firstError(
        dayHoursSchema.safeParse({
          isClosed: false,
          opensAt: "08:00",
          closesAt: null,
        }),
      ),
    ).toBe("Completá la hora de apertura y la de cierre.");
  });

  it("el cierre tiene que ser después de la apertura", () => {
    expect(
      firstError(
        dayHoursSchema.safeParse({
          isClosed: false,
          opensAt: "20:00",
          closesAt: "08:00",
        }),
      ),
    ).toBe("La hora de cierre tiene que ser después de la de apertura.");
  });
});

describe("weekHoursSchema", () => {
  const day = { isClosed: false, opensAt: "08:00", closesAt: "20:00" };

  it("necesita los 7 días, del 0 al 6, sin repetir", () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, ...day }));
    expect(weekHoursSchema.safeParse(week).success).toBe(true);
    expect(weekHoursSchema.safeParse(week.slice(0, 6)).success).toBe(false);
    expect(
      weekHoursSchema.safeParse([...week.slice(0, 6), { weekday: 1, ...day }])
        .success,
    ).toBe(false);
  });
});

describe("specialDaySchema", () => {
  it("la nota puede venir vacía o en null", () => {
    const base = {
      date: "2026-12-25",
      isClosed: true,
      opensAt: null,
      closesAt: null,
    };
    expect(
      specialDaySchema.parse({ ...base, note: null }).note,
    ).toBeUndefined();
    expect(
      specialDaySchema.parse({ ...base, note: "  " }).note,
    ).toBeUndefined();
  });

  it("valida la fecha", () => {
    expect(
      specialDaySchema.safeParse({
        date: "2026-12-25",
        isClosed: true,
        opensAt: null,
        closesAt: null,
        note: "Navidad",
      }).success,
    ).toBe(true);
    expect(
      firstError(
        specialDaySchema.safeParse({
          date: "25/12/2026",
          isClosed: true,
          opensAt: null,
          closesAt: null,
        }),
      ),
    ).toBe("Usá una fecha válida.");
  });
});

describe("coffeeInputSchema", () => {
  const valid = {
    name: "Huila",
    country: "Colombia",
    acidity: 4,
    sweetness: 5,
    body: 2,
    aroma: 4,
    finish: 3,
  };

  it("acepta un café mínimo y completa el tostadero", () => {
    const result = coffeeInputSchema.parse(valid);
    expect(result.roaster).toBe("Puerto Blest");
  });

  it("los valores del pentágono van de 1 a 5", () => {
    expect(firstError(coffeeInputSchema.safeParse({ ...valid, body: 6 }))).toBe(
      "Tiene que ser un número del 1 al 5.",
    );
  });

  it("un campo opcional vaciado en el admin llega como null y queda en nada", () => {
    const result = coffeeInputSchema.parse({
      ...valid,
      farm: null,
      description: null,
      altitudeMasl: null,
    });
    expect(result.farm).toBeUndefined();
    expect(result.description).toBeUndefined();
    expect(result.altitudeMasl).toBeUndefined();
  });
});

describe("productInputSchema", () => {
  const valid = {
    slug: "remera-falco",
    kind: "apparel",
    shelf: "kits",
    name: "Remera Falco",
    detail: "Algodón",
    priceArs: 16000,
  };

  it("acepta un producto y completa los valores por defecto", () => {
    const result = productInputSchema.parse(valid);
    expect(result).toMatchObject({
      isNew: false,
      isVisible: true,
      askStock: false,
      sortOrder: 0,
    });
  });

  it("el precio es un entero en pesos, sin centavos", () => {
    expect(
      firstError(productInputSchema.safeParse({ ...valid, priceArs: 1600.5 })),
    ).toBe("Poné el precio en pesos, sin centavos.");
  });

  it("solo un café puede estar vinculado a un café del catálogo", () => {
    expect(
      firstError(productInputSchema.safeParse({ ...valid, coffeeId: 1 })),
    ).toBe(
      "Solo los productos de tipo café se vinculan a un café del catálogo.",
    );
  });

  it("un producto sin café vinculado acepta null en coffeeId", () => {
    const result = productInputSchema.parse({
      ...valid,
      coffeeId: null,
      description: null,
    });
    expect(result.coffeeId).toBeUndefined();
    expect(result.description).toBeUndefined();
  });

  it("el slug solo lleva minúsculas, números y guiones", () => {
    expect(
      firstError(
        productInputSchema.safeParse({ ...valid, slug: "Remera Falco" }),
      ),
    ).toBe("Usá solo minúsculas, números y guiones.");
  });
});

describe("settingsSchema", () => {
  it("normaliza el número de WhatsApp a solo dígitos", () => {
    const result = settingsSchema.parse({
      hopperCoffeeId: 1,
      whatsappNumber: "+54 9 342 555-1234",
      menuUrl: "https://drive.google.com/file/d/abc/view",
      instagramUrl: "https://www.instagram.com/falco.cafe/",
    });
    expect(result.whatsappNumber).toBe("5493425551234");
  });

  it("el link de la carta tiene que ser https", () => {
    expect(
      firstError(
        settingsSchema.safeParse({
          hopperCoffeeId: null,
          whatsappNumber: "5493425551234",
          menuUrl: "http://drive.google.com/x",
          instagramUrl: "https://www.instagram.com/falco.cafe/",
        }),
      ),
    ).toBe("Pegá un link que empiece con https://");
  });
});
