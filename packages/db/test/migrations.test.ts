import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";

const read = (path: string) =>
  readFileSync(new URL(path, import.meta.url), "utf8");
const MIGRATION = read("../migrations/0001_init.sql");
const SEED = read("../seed/seed.sql");

let db: Database.Database;

beforeEach(() => {
  db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  db.exec(MIGRATION);
  db.exec(SEED);
});

const count = (table: string) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n;

describe("0001_init + seed", () => {
  it("carga los datos de prueba", () => {
    expect(count("coffees")).toBe(1);
    expect(count("products")).toBe(3);
    expect(count("product_options")).toBe(4);
    expect(count("business_hours")).toBe(7);
    const hopper = db
      .prepare("SELECT value FROM settings WHERE key = 'hopper_coffee_id'")
      .get() as { value: string };
    expect(hopper.value).toBe("1");
  });

  it("rechaza valores del pentágono fuera de 1 a 5", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO coffees (name, country, acidity, sweetness, body, aroma, finish) VALUES ('X', 'Brasil', 6, 3, 3, 3, 3)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rechaza un tipo de producto desconocido", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (slug, kind, shelf, name, detail, price_ars) VALUES ('x', 'mate', 'kits', 'X', 'X', 100)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("solo un café puede tener coffee_id", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (slug, kind, shelf, coffee_id, name, detail, price_ars) VALUES ('x', 'gear', 'kits', 1, 'X', 'X', 100)",
        )
        .run(),
    ).toThrow(/CHECK/);
  });

  it("rechaza slugs repetidos", () => {
    expect(() =>
      db
        .prepare(
          "INSERT INTO products (slug, kind, shelf, name, detail, price_ars) VALUES ('remera-falco', 'apparel', 'kits', 'X', 'X', 100)",
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });

  it("al borrar un producto se borran sus talles", () => {
    db.prepare("DELETE FROM products WHERE slug = 'remera-falco'").run();
    expect(count("product_options")).toBe(0);
  });

  it("no deja borrar un café que usa un producto", () => {
    expect(() => db.prepare("DELETE FROM coffees WHERE id = 1").run()).toThrow(
      /FOREIGN KEY/,
    );
  });

  it("un día abierto necesita hora de apertura y de cierre", () => {
    expect(() =>
      db
        .prepare("UPDATE business_hours SET opens_at = NULL WHERE weekday = 1")
        .run(),
    ).toThrow(/CHECK/);
    expect(() =>
      db
        .prepare(
          "UPDATE business_hours SET is_closed = 1, opens_at = NULL, closes_at = NULL WHERE weekday = 1",
        )
        .run(),
    ).not.toThrow();
  });
});
