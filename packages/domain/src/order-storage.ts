import { isExpired, ORDER_LIMITS, type Order, type OrderLine } from "./order";

export const ORDER_STORAGE_KEY = "falco.order.v1";

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isPositiveInt = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;
const isIsoDate = (value: unknown): value is string =>
  typeof value === "string" && !Number.isNaN(Date.parse(value));
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

export function isOrder(value: unknown): value is Order {
  if (typeof value !== "object" || value === null) return false;
  const order = value as Record<string, unknown>;
  return (
    typeof order.code === "string" &&
    isIsoDate(order.updatedAt) &&
    (order.sentAt === undefined || isIsoDate(order.sentAt)) &&
    isOptionalString(order.customerName) &&
    isOptionalString(order.note) &&
    Array.isArray(order.items) &&
    order.items.length <= ORDER_LIMITS.maxProducts &&
    order.items.every(isOrderLine)
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
