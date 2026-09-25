import type { Order, OrderLine } from "./order";

export type CatalogProduct = {
  id: number;
  name: string;
  detail: string;
  priceCardArs: number;
  priceCashArs: number;
  options?: readonly { id: number; label: string }[];
};
export type Catalog = ReadonlyMap<number, CatalogProduct>;

// Falco cobra distinto según cómo se pague: el efectivo/transferencia y la
// tarjeta nunca son el mismo número, así que no hay un "total" único.
export type OrderTotals = { cash: number; card: number };

const CLOSING_QUESTION =
  "¿Me confirman si hay stock y desde qué hora lo puedo retirar?";

export function formatArs(amount: number): string {
  // Nadie tiene que ver "$ NaN" ni un precio en negativo.
  const safe = Number.isFinite(amount) ? Math.max(Math.round(amount), 0) : 0;
  return `$ ${safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

export function orderTotal(order: Order, catalog: Catalog): OrderTotals {
  return order.items.reduce<OrderTotals>(
    (totals, line) => {
      const product = catalog.get(line.productId);
      if (!product) return totals;
      return {
        cash: totals.cash + product.priceCashArs * line.qty,
        card: totals.card + product.priceCardArs * line.qty,
      };
    },
    { cash: 0, card: 0 },
  );
}

type UsableLine = { text: string; cashAmount: number; cardAmount: number };

function usableLine(line: OrderLine, catalog: Catalog): UsableLine | undefined {
  const product = catalog.get(line.productId);
  if (!product) return undefined;
  const option =
    line.optionId === undefined
      ? undefined
      : product.options?.find((o) => o.id === line.optionId);
  // Si la opción que eligió la persona ya no está, se va la línea entera: el
  // mensaje nunca puede cobrar un café sin decir si va en grano o molido.
  if (line.optionId !== undefined && !option) return undefined;
  const parts = [`${line.qty} × ${product.name}`, product.detail];
  // La etiqueta se escribe entera en el admin ("Molido"), así que el mensaje
  // la imprime tal cual: cada producto nombra su opción a su manera.
  if (option) parts.push(option.label);
  return {
    text: `• ${parts.join(" · ")}`,
    cashAmount: product.priceCashArs * line.qty,
    cardAmount: product.priceCardArs * line.qty,
  };
}

function endWithPunctuation(text: string): string {
  return /[.!?…]$/.test(text) ? text : `${text}.`;
}

// Devuelve undefined cuando no queda ninguna línea que pedir: un pedido vacío
// no tiene mensaje que mandar.
export function buildOrderMessage(
  order: Order,
  catalog: Catalog,
): string | undefined {
  const lines = order.items.flatMap((line) => {
    const usable = usableLine(line, catalog);
    return usable ? [usable] : [];
  });
  if (lines.length === 0) return undefined;

  const name = order.customerName?.trim();
  const greeting = name
    ? `¡Buenas! Soy ${name} y quiero hacer este pedido (${order.code}):`
    : `¡Buenas! Quiero hacer este pedido (${order.code}):`;

  const cashTotal = lines.reduce((sum, line) => sum + line.cashAmount, 0);
  const cardTotal = lines.reduce((sum, line) => sum + line.cardAmount, 0);
  const note = order.note?.trim();

  return [
    greeting,
    "",
    ...lines.map((line) => line.text),
    "",
    `Total estimado: ${formatArs(cashTotal)} en efectivo o transferencia · ${formatArs(cardTotal)} con tarjeta`,
    "Lo retiraría en el local cuando me confirmen.",
    ...(note ? [`Comentario: ${endWithPunctuation(note)}`] : []),
    "",
    CLOSING_QUESTION,
  ].join("\n");
}

export function buildWhatsAppUrl(
  whatsappNumber: string,
  message?: string,
): string {
  const digits = whatsappNumber.replace(/\D/g, "");
  if (digits.length < 10)
    throw new Error(`Invalid WhatsApp number: ${whatsappNumber}`);
  // Sin mensaje, el link abre el chat y nada más.
  return message === undefined
    ? `https://wa.me/${digits}`
    : `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
