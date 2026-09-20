import { ORDER_CODE_PATTERN } from "./order-code";
import { isExpired, ORDER_LIMITS, type Order, type OrderLine } from "./order";

export const ORDER_STORAGE_KEY = "falco.order.v1";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isPositiveInt = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;
// Un instante ISO-8601 con zona, como el que escribe toISOString().
// "Sep 19 2026" y "2026-09-19" pasaban por Date.parse y no son instantes.
const ISO_INSTANT =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" &&
  ISO_INSTANT.test(value) &&
  !Number.isNaN(Date.parse(value));
const isOptionalString = (value: unknown): boolean =>
  value === undefined || typeof value === "string";

function isOrderLine(value: unknown): value is OrderLine {
  if (typeof value !== "object" || value === null) return false;
  const line = value as Record<string, unknown>;
  return (
    isPositiveInt(line.productId) &&
    (line.optionId === undefined || isPositiveInt(line.optionId)) &&
    isPositiveInt(line.qty) &&
    (line.qty as number) <= ORDER_LIMITS.maxUnitsPerProduct
  );
}

// Los topes del modelo también valen acá: localStorage se edita a mano.
function respectsLimits(items: readonly OrderLine[]): boolean {
  const keys = new Set<string>();
  const unitsByProduct = new Map<number, number>();
  for (const line of items) {
    const key = `${line.productId}:${line.optionId ?? ""}`;
    if (keys.has(key)) return false;
    keys.add(key);
    const units = (unitsByProduct.get(line.productId) ?? 0) + line.qty;
    if (units > ORDER_LIMITS.maxUnitsPerProduct) return false;
    unitsByProduct.set(line.productId, units);
  }
  return unitsByProduct.size <= ORDER_LIMITS.maxProducts;
}

export function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.code === "string" &&
    ORDER_CODE_PATTERN.test(order.code) &&
    isIsoDate(order.updatedAt) &&
    (order.sentAt === undefined || isIsoDate(order.sentAt)) &&
    isOptionalString(order.customerName) &&
    isOptionalString(order.note) &&
    Array.isArray(order.items) &&
    order.items.every(isOrderLine) &&
    respectsLimits(order.items)
  );
}

export function clearOrder(storage: KeyValueStorage | null): void {
  try {
    storage?.removeItem(ORDER_STORAGE_KEY);
  } catch {
    // Storage is blocked by the browser: nothing to remove.
  }
}

export function loadOrder(
  storage: KeyValueStorage | null,
  now: Date,
): Order | null {
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(ORDER_STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === null) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (isOrder(parsed) && !isExpired(parsed, now)) return parsed;
  } catch {
    // Corrupt JSON: cleared below.
  }
  clearOrder(storage);
  return null;
}

export function saveOrder(
  storage: KeyValueStorage | null,
  order: Order,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
    return true;
  } catch {
    return false;
  }
}
