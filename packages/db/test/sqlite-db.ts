import Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import type { WritableDb, WritableStatement } from "../src/queries";

const sql = (name: string) =>
  readFileSync(new URL(name, import.meta.url), "utf8");

/** Una base en memoria con la migración y el seed, como la local del sitio. */
export function seededDatabase(): Database.Database {
  const real = new Database(":memory:");
  real.pragma("foreign_keys = ON");
  real.exec(sql("../migrations/0001_init.sql"));
  real.exec(sql("../seed/seed.sql"));
  return real;
}

/**
 * better-sqlite3 con la forma de D1: sentencias que se preparan, se atan y
 * recién después se ejecutan, y un `batch` que corre todo en una transacción
 * (lo que hace D1). Así las escrituras se prueban contra SQLite de verdad.
 */
export function toWritableDb(real: Database.Database): WritableDb {
  const statement = (
    text: string,
    values: unknown[] = [],
  ): WritableStatement & { exec(): void } => ({
    bind: (...next: unknown[]) => statement(text, next),
    first<T>() {
      return real.prepare(text).get(...values) as T | undefined;
    },
    all<T>() {
      return real.prepare(text).all(...values) as T[];
    },
    run() {
      return real.prepare(text).run(...values);
    },
    exec() {
      real.prepare(text).run(...values);
    },
  });

  return {
    prepare: (text: string) => statement(text),
    batch(statements: WritableStatement[]) {
      real.transaction(() => {
        for (const s of statements) (s as unknown as { exec(): void }).exec();
      })();
      return [];
    },
  };
}
