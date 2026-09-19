import type { Order, OrderLine } from "./order";

export type CatalogProduct = {
  id: number;
  name: string;
  detail: string;
  priceArs: number;
  options?: readonly { id: number; label: string }[];
};
export type Catalog = ReadonlyMap<number, CatalogProduct>;

const CLOSING_QUESTION =
  "¿Me confirman si hay stock y desde qué hora lo puedo retirar?";

export function formatArs(amount: number): string {
  const rounded = Math.round(amount).toString();
  return `$ ${rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function orderTotal(order: Order, catalog: Catalog): number {
  return order.items.reduce(
    (total, line) =>
      total + (catalog.get(line.productId)?.priceArs ?? 0) * line.qty,
    0,
  );
}

function lineText(line: OrderLine, product: CatalogProduct): string {
  const option =
    line.optionId === undefined
      ? undefined
      : product.options?.find((o) => o.id === line.optionId);
  const parts = [`${line.qty} × ${product.name}`, product.detail];
  if (option) parts.push(`talle ${option.label}`);
  return `• ${parts.join(" · ")}`;
}

function endWithPunctuation(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

export function buildOrderMessage(order: Order, catalog: Catalog): string {
  const name = order.customerName?.trim();
  const greeting = name
    ? `¡Buenas! Soy ${name} y quiero hacer este pedido (${order.code}):`
    : `¡Buenas! Quiero hacer este pedido (${order.code}):`;

  const lines = order.items.flatMap((line) => {
    const product = catalog.get(line.productId);
    return product ? [lineText(line, product)] : [];
  });

  const note = order.note?.trim();

  return [
    greeting,
    "",
    ...lines,
    "",
    `Total estimado: ${formatArs(orderTotal(order, catalog))}`,
    "Lo retiraría en el local cuando me confirmen.",
    ...(note ? [`Comentario: ${endWithPunctuation(note)}`] : []),
    "",
    CLOSING_QUESTION,
  ].join("\n");
}

export function buildWhatsAppUrl(
  whatsappNumber: string,
  message: string,
): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  if (digits.length < 10)
    throw new Error(`Invalid WhatsApp number: ${whatsappNumber}`);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
