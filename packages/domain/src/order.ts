// 20 productos distintos y 2 unidades por producto, sumando todos sus talles.
export const ORDER_LIMITS = { maxProducts: 20, maxUnitsPerProduct: 2 } as const;

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
  "added" | "increased" | "unit_limit" | "product_limit" | "already_sent";

function sameLine(a: LineKey, b: LineKey): boolean {
  return (
    a.productId === b.productId && (a.optionId ?? null) === (b.optionId ?? null)
  );
}

export function unitsForProduct(order: Order, productId: number): number {
  return order.items.reduce(
    (total, line) => (line.productId === productId ? total + line.qty : total),
    0,
  );
}

function productCount(order: Order): number {
  return new Set(order.items.map((line) => line.productId)).size;
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

  // El tope de unidades es del producto: los talles lo comparten.
  if (unitsForProduct(order, key.productId) >= ORDER_LIMITS.maxUnitsPerProduct)
    return { order, outcome: "unit_limit" };

  const existing = order.items.find((line) => sameLine(line, key));
  if (existing) {
    const items = order.items.map((line) =>
      line === existing ? { ...line, qty: line.qty + 1 } : line,
    );
    return { order: touch(order, now, { items }), outcome: "increased" };
  }

  // Otro talle de un producto que ya está no es un producto nuevo.
  const isNewProduct = !order.items.some(
    (line) => line.productId === key.productId,
  );
  if (isNewProduct && productCount(order) >= ORDER_LIMITS.maxProducts)
    return { order, outcome: "product_limit" };

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
  // Lo que queda del producto después de los otros talles, nunca menos de 1:
  // para dejar la línea en cero está removeItem.
  const others = unitsForProduct(order, key.productId) - existing.qty;
  const room = Math.max(ORDER_LIMITS.maxUnitsPerProduct - others, 1);
  const clamped = Math.min(floored, room);
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
