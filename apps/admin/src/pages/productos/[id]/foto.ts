import { env } from "cloudflare:workers";
import { getProductForAdmin, setProductImage } from "@falco/db";
import { rutaDeFoto } from "../../../subir-foto";

/** La foto de un producto: la de su ficha y su tarjeta en la tienda. */
export const POST = rutaDeFoto({
  carpeta: "productos",
  lista: "/productos",
  guardar: (id, clave, quien) => setProductImage(env.DB, id, clave, quien),
  claveActual: (id) => getProductForAdmin(env.DB, id),
});
