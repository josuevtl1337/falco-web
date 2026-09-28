import type { Coffee, CoffeeDraft } from "@falco/db";

/**
 * Un café, del formulario a lo que valida `coffeeInputSchema`. Los números
 * vacíos quedan sin valor (y el esquema dice qué falta); los textos se
 * mandan tal cual y el esquema los recorta.
 */
export function leerCafe(form: FormData, prefijo = ""): CoffeeDraft {
  // El perfil (acidity, sweetness…) va sin prefijo: los radios del
  // componente Perfil se llaman así en las dos fichas.
  const PERFIL = ["acidity", "sweetness", "body", "aroma", "finish"];
  const texto = (campo: string) =>
    String(form.get(PERFIL.includes(campo) ? campo : `${prefijo}${campo}`) ?? "");
  const numero = (campo: string) => {
    const valor = texto(campo).trim();
    return valor === "" ? undefined : Number(valor);
  };
  return {
    name: texto("name"),
    farm: texto("farm"),
    country: texto("country"),
    variety: texto("variety"),
    process: texto("process"),
    altitudeMasl: numero("altitudeMasl"),
    tastingNotes: texto("tastingNotes"),
    description: texto("description"),
    roaster: texto("roaster") || "Puerto Blest",
    acidity: numero("acidity") as number,
    sweetness: numero("sweetness") as number,
    body: numero("body") as number,
    aroma: numero("aroma") as number,
    finish: numero("finish") as number,
  };
}

/** Lo que el formulario muestra: un café guardado, o lo que se escribió. */
export type CafeForm = {
  name: string;
  farm: string;
  country: string;
  variety: string;
  process: string;
  altitudeMasl: string;
  tastingNotes: string;
  description: string;
  roaster: string;
  perfil: { acidity: number; sweetness: number; body: number; aroma: number; finish: number };
};

export const CAFE_VACIO: CafeForm = {
  name: "",
  farm: "",
  country: "",
  variety: "",
  process: "",
  altitudeMasl: "",
  tastingNotes: "",
  description: "",
  roaster: "Puerto Blest",
  perfil: { acidity: 3, sweetness: 3, body: 3, aroma: 3, finish: 3 },
};

export function cafeAForm(cafe: Coffee): CafeForm {
  return {
    name: cafe.name,
    farm: cafe.farm ?? "",
    country: cafe.country,
    variety: cafe.variety ?? "",
    process: cafe.process ?? "",
    altitudeMasl: cafe.altitudeMasl === undefined ? "" : String(cafe.altitudeMasl),
    tastingNotes: cafe.tastingNotes ?? "",
    description: cafe.description ?? "",
    roaster: cafe.roaster,
    perfil: { ...cafe.profile },
  };
}

export function borradorAForm(borrador: CoffeeDraft): CafeForm {
  const perfil = (v: number | undefined) => (typeof v === "number" && v >= 1 && v <= 5 ? v : 3);
  return {
    name: borrador.name ?? "",
    farm: borrador.farm ?? "",
    country: borrador.country ?? "",
    variety: borrador.variety ?? "",
    process: borrador.process ?? "",
    altitudeMasl: borrador.altitudeMasl == null ? "" : String(borrador.altitudeMasl),
    tastingNotes: borrador.tastingNotes ?? "",
    description: borrador.description ?? "",
    roaster: borrador.roaster ?? "Puerto Blest",
    perfil: {
      acidity: perfil(borrador.acidity),
      sweetness: perfil(borrador.sweetness),
      body: perfil(borrador.body),
      aroma: perfil(borrador.aroma),
      finish: perfil(borrador.finish),
    },
  };
}

/** "Sidama · Etiopía": como se nombra un café en todo el admin y en el sitio. */
export const nombreCafe = (c: { name: string; country: string }) => `${c.name} · ${c.country}`;
