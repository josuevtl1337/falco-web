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
import { getMenuItemForAdmin, listMenu, listMenuForAdmin } from "../src/queries";
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

describe("la carta que ve el público", () => {
  it("trae las categorías y sus ítems en orden", async () => {
    const carta = await listMenu(db);
    expect(nombres(carta)).toEqual(["Café", "Filtrados", "Sin café", "Pastelería"]);
    expect(nombres(carta[0]!.items).slice(0, 3)).toEqual(["Espresso", "Cortado", "Flat white"]);
    expect(carta[0]!.note).toBe("Leche vegetal +$800");
    expect(carta[2]!.note).toBeUndefined();
  });

  it("no muestra lo oculto ni las categorías que quedan vacías", async () => {
    real.prepare("UPDATE menu_items SET is_visible = 0 WHERE name = 'Espresso'").run();
    real.prepare("UPDATE menu_items SET is_visible = 0 WHERE category_id = 3").run();
    real.prepare("UPDATE menu_categories SET is_visible = 0 WHERE id = 2").run();
    const carta = await listMenu(db);
    expect(nombres(carta)).toEqual(["Café", "Pastelería"]);
    expect(nombres(carta[0]!.items)).not.toContain("Espresso");
  });

  it("el admin ve todo, también lo oculto y lo vacío", async () => {
    real.prepare("UPDATE menu_categories SET is_visible = 0 WHERE id = 2").run();
    await saveMenuCategory(db, undefined, { name: "Brunch" }, QUIEN);
    const carta = await listMenuForAdmin(db);
    expect(nombres(carta)).toEqual(["Café", "Filtrados", "Sin café", "Pastelería", "Brunch"]);
    expect(carta[1]!.isVisible).toBe(false);
  });
});

describe("las categorías", () => {
  it("una nueva va al final", async () => {
    const r = await saveMenuCategory(db, undefined, { name: "Brunch", note: "Hasta las 13" }, QUIEN);
    expect(r.ok).toBe(true);
    const ultima = (await listMenuForAdmin(db)).at(-1);
    expect(ultima).toMatchObject({ name: "Brunch", note: "Hasta las 13", isVisible: true });
  });

  it("no deja repetir un nombre, aunque cambien las mayúsculas", async () => {
    const r = await saveMenuCategory(db, undefined, { name: "café" }, QUIEN);
    expect(r).toMatchObject({ ok: false, errors: { name: "Ya hay una categoría con ese nombre." } });
    // Guardarse a sí misma con el mismo nombre sí se puede.
    expect((await saveMenuCategory(db, 1, { name: "Café", note: "" }, QUIEN)).ok).toBe(true);
  });

  it("no borra una categoría con ítems; vacía, sí", async () => {
    const llena = await deleteMenuCategory(db, 1);
    expect(llena.ok).toBe(false);
    const { id } = (await saveMenuCategory(db, undefined, { name: "Brunch" }, QUIEN)) as { id: number };
    expect((await deleteMenuCategory(db, id)).ok).toBe(true);
    expect(nombres(await listMenuForAdmin(db))).not.toContain("Brunch");
  });
});

describe("los ítems", () => {
  it("crea uno al final de su categoría y lo edita", async () => {
    const r = await saveMenuItem(db, undefined, { categoryId: 4, name: "Scon", priceArs: 2000 }, QUIEN);
    expect(r.ok).toBe(true);
    const id = (r as { id: number }).id;
    const pasteleria = (await listMenuForAdmin(db))[3]!;
    expect(pasteleria.items.at(-1)).toMatchObject({ id, name: "Scon", priceArs: 2000, isVisible: true });

    const editado = await saveMenuItem(
      db,
      id,
      { categoryId: 4, name: "Scon de queso", description: "Tibio", priceArs: 2400, isVisible: false },
      QUIEN,
    );
    expect(editado.ok).toBe(true);
    expect(await getMenuItemForAdmin(db, id)).toMatchObject({
      name: "Scon de queso",
      description: "Tibio",
      priceArs: 2400,
      isVisible: false,
    });
  });

  it("al cambiar de categoría va al final de la nueva", async () => {
    const espresso = (await listMenuForAdmin(db))[0]!.items[0]!;
    await saveMenuItem(db, espresso.id, { categoryId: 2, name: "Espresso", priceArs: 3500 }, QUIEN);
    const filtrados = (await listMenuForAdmin(db))[1]!;
    expect(filtrados.items.at(-1)!.name).toBe("Espresso");
  });

  it("valida el precio y la categoría", async () => {
    const sinPrecio = await saveMenuItem(db, undefined, { categoryId: 1, name: "Algo", priceArs: Number.NaN }, QUIEN);
    expect(sinPrecio).toMatchObject({ ok: false, errors: { priceArs: "Poné el precio en pesos, sin centavos." } });
    const otraCategoria = await saveMenuItem(db, undefined, { categoryId: 99, name: "Algo", priceArs: 10 }, QUIEN);
    expect(otraCategoria).toMatchObject({ ok: false, errors: { categoryId: "Esa categoría ya no existe. Elegí otra." } });
  });

  it("al borrar devuelve la foto para sacarla de R2", async () => {
    await setMenuItemImage(db, 1, "carta/1-abc.webp", QUIEN);
    expect(await deleteMenuItem(db, 1)).toEqual({ ok: true, imageKey: "carta/1-abc.webp" });
    expect((await deleteMenuItem(db, 1)).ok).toBe(false);
  });

  it("la foto guarda la clave nueva y devuelve la anterior", async () => {
    expect(await setMenuItemImage(db, 2, "carta/2-a.webp", QUIEN)).toEqual({ ok: true, previousKey: null });
    expect(await setMenuItemImage(db, 2, null, QUIEN)).toEqual({ ok: true, previousKey: "carta/2-a.webp" });
  });
});

describe("el orden de la carta", () => {
  it("ordena las categorías y los ítems de una categoría", async () => {
    expect((await reorderMenu(db, undefined, [4, 3, 2, 1], QUIEN)).ok).toBe(true);
    expect(nombres(await listMenu(db))).toEqual(["Pastelería", "Sin café", "Filtrados", "Café"]);

    const ids = (await listMenuForAdmin(db))[3]!.items.map((i) => i.id).reverse();
    expect((await reorderMenu(db, 1, ids, QUIEN)).ok).toBe(true);
    expect((await listMenu(db))[3]!.items[0]!.name).toBe("Iced latte");
  });

  it("si la lista cambió mientras tanto, no toca nada", async () => {
    const r = await reorderMenu(db, undefined, [1, 2, 3], QUIEN);
    expect(r.ok).toBe(false);
  });
});
