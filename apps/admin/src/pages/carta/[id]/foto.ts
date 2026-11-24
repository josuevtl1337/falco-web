import { env } from "cloudflare:workers";
import { getMenuItemForAdmin, setMenuItemImage } from "@falco/db";
import { rutaDeFoto } from "../../../subir-foto";

/** La foto de un ítem de la carta: va a la derecha de su tarjeta en /carta. */
export const POST = rutaDeFoto({
  carpeta: "carta",
  lista: "/carta",
  guardar: (id, clave, quien) => setMenuItemImage(env.DB, id, clave, quien),
  claveActual: (id) => getMenuItemForAdmin(env.DB, id),
});
