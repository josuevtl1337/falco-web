import type { Coffee, ProductDraft, ProductWithOptions } from "@falco/db";
import { borradorAForm, CAFE_VACIO, cafeAForm, leerCafe, type CafeForm } from "./cafe";

export const TIPOS = [
  { id: "coffee", nombre: "Café" },
  { id: "gear", nombre: "Accesorio" },
  { id: "kit", nombre: "Kit" },
  { id: "apparel", nombre: "Ropa" },
] as const;

export type Tipo = (typeof TIPOS)[number]["id"];

/**
 * "12.000", "12000" y "$ 12.000" son lo mismo: los pesos se escriben con
 * punto de miles. Una coma (centavos) se deja pasar, para que la validación
 * diga "sin centavos" en vez de adivinar.
 */
export function leerPrecio(texto: string): number {
  const limpio = texto.replace(/[$\s.]/g, "").replace(",", ".");
  return limpio === "" ? Number.NaN : Number(limpio);
}

export type OpcionForm = { id?: number; label: string; disponible: boolean };

export type ProductoForm = {
  kind: Tipo;
  name: string;
  detail: string;
  description: string;
  priceCashArs: string;
  priceCardArs: string;
  isNew: boolean;
  isVisible: boolean;
  askStock: boolean;
  cafe: CafeForm;
  opciones: OpcionForm[];
};

export const PRODUCTO_VACIO: ProductoForm = {
  kind: "gear",
  name: "",
  detail: "",
  description: "",
  priceCashArs: "",
  priceCardArs: "",
  isNew: true,
  isVisible: true,
  askStock: false,
  cafe: CAFE_VACIO,
  opciones: [],
};

const pesos = (n: number) => n.toLocaleString("es-AR");

export function productoAForm(p: ProductWithOptions, cafe?: Coffee): ProductoForm {
  return {
    kind: p.kind,
    name: p.name,
    detail: p.detail,
    description: p.description ?? "",
    priceCashArs: pesos(p.priceCashArs),
    priceCardArs: pesos(p.priceCardArs),
    isNew: p.isNew,
    isVisible: p.isVisible,
    askStock: p.askStock,
    cafe: cafe ? cafeAForm(cafe) : CAFE_VACIO,
    opciones: p.options.map((o) => ({ id: o.id, label: o.label, disponible: o.isAvailable })),
  };
}

/** Lo que vino del formulario, listo para `saveProduct`, y cómo volver a mostrarlo. */
export function leerProducto(form: FormData): { borrador: ProductDraft; valores: ProductoForm } {
  const texto = (campo: string) => String(form.get(campo) ?? "");
  const kind = (TIPOS.find((t) => t.id === texto("kind"))?.id ?? "gear") as Tipo;

  const ids = form.getAll("opcion-id").map(String);
  const labels = form.getAll("opcion-label").map(String);
  const stock = form.getAll("opcion-stock").map(String);
  const opciones: OpcionForm[] = labels
    .map((label, i) => ({
      id: ids[i] ? Number(ids[i]) : undefined,
      label: label.trim(),
      disponible: stock[i] !== "0",
    }))
    // Una fila sin nombre es la fila vacía de más: no es una molienda.
    .filter((o) => o.label !== "")
    // Accesorios y kits no tienen opciones: lo que haya quedado oculto en el
    // formulario (por haber cambiado el tipo) no se manda.
    .filter(() => kind === "coffee" || kind === "apparel");

  const cafe = kind === "coffee" ? leerCafe(form, "coffee-") : undefined;

  const borrador: ProductDraft = {
    product: {
      kind,
      name: texto("name"),
      detail: texto("detail"),
      description: texto("description"),
      priceCashArs: leerPrecio(texto("priceCashArs")),
      priceCardArs: leerPrecio(texto("priceCardArs")),
      isNew: form.has("isNew"),
      isVisible: form.has("isVisible"),
      askStock: form.has("askStock"),
    },
    coffee: cafe,
    options: opciones.map((o) => ({ id: o.id, label: o.label, isAvailable: o.disponible })),
  };

  const valores: ProductoForm = {
    kind,
    name: texto("name"),
    detail: texto("detail"),
    description: texto("description"),
    priceCashArs: texto("priceCashArs"),
    priceCardArs: texto("priceCardArs"),
    isNew: form.has("isNew"),
    isVisible: form.has("isVisible"),
    askStock: form.has("askStock"),
    cafe: cafe ? borradorAForm(cafe) : CAFE_VACIO,
    opciones,
  };
  return { borrador, valores };
}
