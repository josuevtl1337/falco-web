import { env } from "cloudflare:workers";
import { getHopperCoffeeById, setHopperCoffeeImage } from "@falco/db";
import { rutaDeFoto } from "../../../subir-foto";

/** La foto de un café de tolva: la que gira en la vitrina de la home. */
export const POST = rutaDeFoto({
  carpeta: "tolva",
  lista: "/tolva",
  guardar: (id, clave, quien) => setHopperCoffeeImage(env.DB, id, clave, quien),
  claveActual: (id) => getHopperCoffeeById(env.DB, id),
});
