import type { MenuCategory, MenuCategoryDraft, MenuItem, MenuItemDraft } from "@falco/db";
import { leerPrecio } from "./producto";

/**
 * Los formularios de la carta: lo que llega del navegador (todo texto) y lo
 * que se vuelve a mostrar si algo no pasó la validación.
 */

export type CategoriaForm = { name: string; note: string; isVisible: boolean };

export const CATEGORIA_VACIA: CategoriaForm = { name: "", note: "", isVisible: true };

export const categoriaAForm = (c: MenuCategory): CategoriaForm => ({
  name: c.name,
  note: c.note ?? "",
  isVisible: c.isVisible,
});

export function leerCategoria(form: FormData): { valores: CategoriaForm; borrador: MenuCategoryDraft } {
  const valores: CategoriaForm = {
    name: String(form.get("name") ?? ""),
    note: String(form.get("note") ?? ""),
    isVisible: form.get("isVisible") === "on",
  };
  return { valores, borrador: { ...valores } };
}

export type ItemForm = {
  categoryId: string;
  name: string;
  description: string;
  priceArs: string;
  isVisible: boolean;
};

export const itemVacio = (categoryId?: number): ItemForm => ({
  categoryId: categoryId ? String(categoryId) : "",
  name: "",
  description: "",
  priceArs: "",
  isVisible: true,
});

export const itemAForm = (i: MenuItem): ItemForm => ({
  categoryId: String(i.categoryId),
  name: i.name,
  description: i.description ?? "",
  priceArs: i.priceArs.toLocaleString("es-AR"),
  isVisible: i.isVisible,
});

export function leerItem(form: FormData): { valores: ItemForm; borrador: MenuItemDraft } {
  const valores: ItemForm = {
    categoryId: String(form.get("categoryId") ?? ""),
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    priceArs: String(form.get("priceArs") ?? ""),
    isVisible: form.get("isVisible") === "on",
  };
  return {
    valores,
    borrador: {
      categoryId: Number(valores.categoryId) || 0,
      name: valores.name,
      description: valores.description,
      priceArs: leerPrecio(valores.priceArs),
      isVisible: valores.isVisible,
    },
  };
}
