export const ORDER_LIMITS = { maxLines: 20, maxUnitsPerLine: 2 } as const;

const HOUR_MS = 60 * 60 * 1000;
export const ORDER_TTL = {
  draftMs: 72 * HOUR_MS,
  sentMs: 48 * HOUR_MS,
} as const;

export type LineKey = { productId: number; optionId?: number };
export type OrderLine = LineKey & { qty: number };
export type Order = {
  code: string;
  items: OrderLine[];
  customerName?: string;
  note?: string;
  updatedAt: string;
  sentAt?: string;
};
export type AddOutcome =
  "added" | "increased" | "unit_limit" | "line_limit" | "already_sent";

function sameLine(a: LineKey, b: LineKey): boolean {
  return (
    a.productId === b.productId && (a.optionId ?? null) === (b.optionId ?? null)
  );
}

function touch(order: Order, now: Date, changes: Partial<Order>): Order {
  return { ...order, ...changes, updatedAt: now.toISOString() };
}

export function createOrder(code: string, now: Date): Order {
  return { code, items: [], updatedAt: now.toISOString() };
}

export function addItem(
  order: Order,
  key: LineKey,
  now: Date,
): { order: Order; outcome: AddOutcome } {
  if (order.sentAt) return { order, outcome: "already_sent" };

  const existing = order.items.find((line) => sameLine(line, key));
  if (existing) {
    if (existing.qty >= ORDER_LIMITS.maxUnitsPerLine)
      return { order, outcome: "unit_limit" };
    const items = order.items.map((line) =>
      line === existing ? { ...line, qty: line.qty + 1 } : line,
    );
    return { order: touch(order, now, { items }), outcome: "increased" };
  }

  if (order.items.length >= ORDER_LIMITS.maxLines)
    return { order, outcome: "line_limit" };

  const line: OrderLine =
    key.optionId === undefined
      ? { productId: key.productId, qty: 1 }
      : { productId: key.productId, optionId: key.optionId, qty: 1 };
  return {
    order: touch(order, now, { items: [...order.items, line] }),
    outcome: "added",
  };
}

export function removeItem(order: Order, key: LineKey, now: Date): Order {
  const items = order.items.filter((line) => !sameLine(line, key));
  return items.length === order.items.length
    ? order
    : touch(order, now, { items });
}

export function setQty(
  order: Order,
  key: LineKey,
  qty: number,
  now: Date,
): Order {
  const existing = order.items.find((line) => sameLine(line, key));
  if (!existing) return order;
  if (!Number.isFinite(qty)) return order;
  const floored = Math.floor(qty);
  if (floored < 1) return removeItem(order, key, now);
  const clamped = Math.min(floored, ORDER_LIMITS.maxUnitsPerLine);
  if (clamped === existing.qty) return order;
  const items = order.items.map((line) =>
    sameLine(line, key) ? { ...line, qty: clamped } : line,
  );
  return touch(order, now, { items });
}

export function setCustomer(
  order: Order,
  fields: { customerName?: string; note?: string },
  now: Date,
): Order {
  const customerName = fields.customerName?.trim() || undefined;
  const note = fields.note?.trim() || undefined;
  if (customerName === order.customerName && note === order.note) return order;
  return touch(order, now, { customerName, note });
}

export function markSent(order: Order, now: Date): Order {
  return touch(order, now, { sentAt: now.toISOString() });
}

export function pruneUnavailable(
  order: Order,
  isAvailable: (line: OrderLine) => boolean,
  now: Date,
): Order {
  const items = order.items.filter(isAvailable);
  return items.length === order.items.length
    ? order
    : touch(order, now, { items });
}

export function isExpired(order: Order, now: Date): boolean {
  const reference = order.sentAt ?? order.updatedAt;
  const ttl = order.sentAt ? ORDER_TTL.sentMs : ORDER_TTL.draftMs;
  return now.getTime() - Date.parse(reference) >= ttl;
}

export function unitCount(order: Order): number {
  return order.items.reduce((total, line) => total + line.qty, 0);
}
