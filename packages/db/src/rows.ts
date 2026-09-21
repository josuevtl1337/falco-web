export type CoffeeRow = {
  id: number;
  name: string;
  farm: string | null;
  country: string;
  variety: string | null;
  process: string | null;
  altitude_masl: number | null;
  tasting_notes: string | null;
  description: string | null;
  roaster: string;
  acidity: number;
  sweetness: number;
  body: number;
  aroma: number;
  finish: number;
};

export type ProductRow = {
  id: number;
  slug: string;
  kind: string;
  shelf: string;
  coffee_id: number | null;
  name: string;
  detail: string;
  description: string | null;
  price_card_ars: number;
  price_cash_ars: number;
  image_key: string | null;
  is_new: number;
  is_visible: number;
  ask_stock: number;
  sort_order: number;
};

export type ProductOptionRow = {
  id: number;
  product_id: number;
  label: string;
  is_available: number;
  sort_order: number;
};

export type TastingProfile = {
  acidity: number;
  sweetness: number;
  body: number;
  aroma: number;
  finish: number;
};

export type Coffee = {
  id: number;
  name: string;
  farm?: string;
  country: string;
  variety?: string;
  process?: string;
  altitudeMasl?: number;
  tastingNotes?: string;
  description?: string;
  roaster: string;
  profile: TastingProfile;
};

export type ProductOption = {
  id: number;
  label: string;
  isAvailable: boolean;
  sortOrder: number;
};

export type Product = {
  id: number;
  slug: string;
  kind: "coffee" | "gear" | "kit" | "apparel";
  shelf: "coffee" | "kits";
  coffeeId?: number;
  name: string;
  detail: string;
  description?: string;
  priceCardArs: number;
  priceCashArs: number;
  imageKey?: string;
  isNew: boolean;
  isVisible: boolean;
  askStock: boolean;
  sortOrder: number;
};

export type ProductWithOptions = Product & { options: ProductOption[] };

// SQLite guarda los booleanos como 0 y 1, y las columnas vacías como NULL.
// El resto del código habla en booleanos y en undefined.
const bool = (value: number): boolean => value === 1;
const maybe = <T>(value: T | null): T | undefined => value ?? undefined;

export function toCoffee(row: CoffeeRow): Coffee {
  return {
    id: row.id,
    name: row.name,
    farm: maybe(row.farm),
    country: row.country,
    variety: maybe(row.variety),
    process: maybe(row.process),
    altitudeMasl: maybe(row.altitude_masl),
    tastingNotes: maybe(row.tasting_notes),
    description: maybe(row.description),
    roaster: row.roaster,
    profile: {
      acidity: row.acidity,
      sweetness: row.sweetness,
      body: row.body,
      aroma: row.aroma,
      finish: row.finish,
    },
  };
}

export function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    kind: row.kind as Product["kind"],
    shelf: row.shelf as Product["shelf"],
    coffeeId: maybe(row.coffee_id),
    name: row.name,
    detail: row.detail,
    description: maybe(row.description),
    priceCardArs: row.price_card_ars,
    priceCashArs: row.price_cash_ars,
    imageKey: maybe(row.image_key),
    isNew: bool(row.is_new),
    isVisible: bool(row.is_visible),
    askStock: bool(row.ask_stock),
    sortOrder: row.sort_order,
  };
}

export function toProductOption(row: ProductOptionRow): ProductOption {
  return {
    id: row.id,
    label: row.label,
    isAvailable: bool(row.is_available),
    sortOrder: row.sort_order,
  };
}
