import type Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteMenuCategory,
  deleteMenuItem,
  reorderMenu,
  saveMenuCategory,
  saveMenuItem,
  setMenuItemImage,
} from "../src/mutations";
import {
  getMenuItemForAdmin,
  listMenu,
  listMenuForAdmin,
} from "../src/queries";
import type { WritableDb } from "../src/queries";
import { seededDatabase, toWritableDb } from "./sqlite-db";

const QUIEN = "duenio@falco.cafe";

let real: Database.Database;
let db: WritableDb;

beforeEach(() => {
  real = seededDatabase();
  db = toWritableDb(real);
});

const nombres = (items: { name: string }[]) => items.map((i) => i.name);

/** El id de una categoría de la carta de verano (0005), por su nombre. */
const categoria = (name: string): number =>
  (
    real.prepare("SELECT id FROM menu_categories WHERE name = ?").get(name) as {
      id: number;
    }
  ).id;

const CATEGORIAS = [
  "Clásicos",
  "Dulces y cremosos",
  "Fríos",
  "Sin café",
  "Milkshakes",
  "Vermú",
  "Salados",
  "Dulces",
  "Rellenos",
  "Tortas",
  "Combos",
];

describe("la carta que ve el público", () => {
  it("trae las categorías y sus ítems en el orden de la carta impresa", async () => {
    const carta = await listMenu(db);
    expect(nombres(carta)).toEqual(CATEGORIAS);
    expect(nombres(carta[0]!.items)).toEqual([
      "Espresso",
      "Americano",
      "Filtrado",
      "Café con leche",
    ]);
    expect(carta[0]!.items[0]).toMatchObject({
      description: "Fuerte, corto e intenso.",
      priceArs: 4200,
    });
    expect(carta[2]!.note).toBe("Con hielo de cold brew · Todos $6.500");
    expect(carta[4]!.note).toBeUndefined();
    expect(carta[4]!.items[0]!.description).toBeUndefined();
  });

  it("no muestra lo oculto ni las categorías que quedan vacías", async () => {
    real
      .prepare("UPDATE menu_items SET is_visible = 0 WHERE name = 'Espresso'")
      .run();
    real
      .prepare("UPDATE menu_items SET is_visible = 0 WHERE category_id = ?")
      .run(categoria("Milkshakes"));
    real
      .prepare("UPDATE menu_categories SET is_visible = 0 WHERE name = 'Vermú'")
      .run();
    const carta = await listMenu(db);
    expect(nombres(carta)).not.toContain("Milkshakes");
    expect(nombres(carta)).not.toContain("Vermú");
    expect(nombres(carta[0]!.items)).not.toContain("Espresso");
  });

  it("el admin ve todo, también lo oculto y lo vacío", async () => {
    real
      .prepare("UPDATE menu_categories SET is_visible = 0 WHERE name = 'Vermú'")
      .run();
    await saveMenuCategory(db, undefined, { name: "Brunch" }, QUIEN);
    const carta = await listMenuForAdmin(db);
    expect(nombres(carta)).toEqual([...CATEGORIAS, "Brunch"]);
    expect(carta.find((c) => c.name === "Vermú")!.isVisible).toBe(false);
  });
});

describe("las categorías", () => {
  it("una nueva va al final", async () => {
    const r = await saveMenuCategory(
      db,
      undefined,
      { name: "Brunch", note: "Hasta las 13" },
      QUIEN,
    );
    expect(r.ok).toBe(true);
    const ultima = (await listMenuForAdmin(db)).at(-1);
    expect(ultima).toMatchObject({
      name: "Brunch",
      note: "Hasta las 13",
      isVisible: true,
    });
  });

  it("no deja repetir un nombre, aunque cambien las mayúsculas", async () => {
    const r = await saveMenuCategory(db, undefined, { name: "COMBOS" }, QUIEN);
    expect(r).toMatchObject({
      ok: false,
      errors: { name: "Ya hay una categoría con ese nombre." },
    });
    // Guardarse a sí misma con el mismo nombre sí se puede.
    expect(
      (
        await saveMenuCategory(
          db,
          categoria("Combos"),
          { name: "Combos", note: "" },
          QUIEN,
        )
      ).ok,
    ).toBe(true);
  });

  it("no borra una categoría con ítems; vacía, sí", async () => {
    expect((await deleteMenuCategory(db, categoria("Clásicos"))).ok).toBe(
      false,
    );
    const { id } = (await saveMenuCategory(
      db,
      undefined,
      { name: "Brunch" },
      QUIEN,
    )) as { id: number };
    expect((await deleteMenuCategory(db, id)).ok).toBe(true);
    expect(nombres(await listMenuForAdmin(db))).not.toContain("Brunch");
  });
});

describe("los ítems", () => {
  it("crea uno al final de su categoría y lo edita", async () => {
    const tortas = categoria("Tortas");
    const r = await saveMenuItem(
      db,
      undefined,
      { categoryId: tortas, name: "Budín", priceArs: 5000 },
      QUIEN,
    );
    expect(r.ok).toBe(true);
    const id = (r as { id: number }).id;
    const enTortas = (await listMenuForAdmin(db)).find((c) => c.id === tortas)!;
    expect(enTortas.items.at(-1)).toMatchObject({
      id,
      name: "Budín",
      priceArs: 5000,
      isVisible: true,
    });

    const editado = await saveMenuItem(
      db,
      id,
      {
        categoryId: tortas,
        name: "Budín de limón",
        description: "La porción",
        priceArs: 5400,
        isVisible: false,
      },
      QUIEN,
    );
    expect(editado.ok).toBe(true);
    expect(await getMenuItemForAdmin(db, id)).toMatchObject({
      name: "Budín de limón",
      description: "La porción",
      priceArs: 5400,
      isVisible: false,
    });
  });

  it("al cambiar de categoría va al final de la nueva", async () => {
    const espresso = (await listMenuForAdmin(db))[0]!.items[0]!;
    await saveMenuItem(
      db,
      espresso.id,
      { categoryId: categoria("Fríos"), name: "Espresso", priceArs: 4200 },
      QUIEN,
    );
    const frios = (await listMenuForAdmin(db)).find((c) => c.name === "Fríos")!;
    expect(frios.items.at(-1)!.name).toBe("Espresso");
  });

  it("valida el precio y la categoría", async () => {
    const clasicos = categoria("Clásicos");
    const sinPrecio = await saveMenuItem(
      db,
      undefined,
      { categoryId: clasicos, name: "Algo", priceArs: Number.NaN },
      QUIEN,
    );
    expect(sinPrecio).toMatchObject({
      ok: false,
      errors: { priceArs: "Poné el precio en pesos, sin centavos." },
    });
    const otraCategoria = await saveMenuItem(
      db,
      undefined,
      { categoryId: 999, name: "Algo", priceArs: 10 },
      QUIEN,
    );
    expect(otraCategoria).toMatchObject({
      ok: false,
      errors: { categoryId: "Esa categoría ya no existe. Elegí otra." },
    });
  });

  it("al borrar devuelve la foto para sacarla de R2", async () => {
    await setMenuItemImage(db, 1, "carta/1-abc.webp", QUIEN);
    expect(await deleteMenuItem(db, 1)).toEqual({
      ok: true,
      imageKey: "carta/1-abc.webp",
    });
    expect((await deleteMenuItem(db, 1)).ok).toBe(false);
  });

  it("la foto guarda la clave nueva y devuelve la anterior", async () => {
    expect(await setMenuItemImage(db, 2, "carta/2-a.webp", QUIEN)).toEqual({
      ok: true,
      previousKey: null,
    });
    expect(await setMenuItemImage(db, 2, null, QUIEN)).toEqual({
      ok: true,
      previousKey: "carta/2-a.webp",
    });
  });
});

describe("el orden de la carta", () => {
  it("ordena las categorías y los ítems de una categoría", async () => {
    const ids = (await listMenuForAdmin(db)).map((c) => c.id).reverse();
    expect((await reorderMenu(db, undefined, ids, QUIEN)).ok).toBe(true);
    expect(nombres(await listMenu(db))).toEqual([...CATEGORIAS].reverse());

    const clasicos = categoria("Clásicos");
    const items = (await listMenuForAdmin(db))
      .find((c) => c.id === clasicos)!
      .items.map((i) => i.id)
      .reverse();
    expect((await reorderMenu(db, clasicos, items, QUIEN)).ok).toBe(true);
    expect(
      (await listMenu(db)).find((c) => c.id === clasicos)!.items[0]!.name,
    ).toBe("Café con leche");
  });

  it("si la lista cambió mientras tanto, no toca nada", async () => {
    const r = await reorderMenu(db, undefined, [1, 2, 3], QUIEN);
    expect(r.ok).toBe(false);
  });
});
