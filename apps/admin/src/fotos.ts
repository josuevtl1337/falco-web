/**
 * Las fotos de los productos: qué se acepta y con qué nombre se guarda.
 *
 * El navegador ya las achica y las pasa a WebP (scripts/achicar-foto.ts). Si
 * el navegador no sabe escribir WebP (Safari viejo), llega JPEG. Nada más: una
 * foto de 6 MB sin achicar no pasa.
 */

export const FOTO_MAXIMA = 1.5 * 1024 * 1024;

const EXTENSIONES: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
};

export function validarFoto(tipo: string, tamanio: number): string | null {
  if (!EXTENSIONES[tipo]) return "La foto tiene que ser WebP o JPEG.";
  if (tamanio === 0) return "La foto llegó vacía. Probá de nuevo.";
  if (tamanio > FOTO_MAXIMA) return "La foto pesa demasiado. Probá con otra o desde el celular.";
  return null;
}

/**
 * `productos/<id>-<hash>.<ext>`: el hash del contenido hace que cada foto
 * tenga su propia dirección, así el sitio la puede cachear para siempre.
 */
export async function claveDeFoto(id: number, bytes: ArrayBuffer, tipo: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `productos/${id}-${hash}.${EXTENSIONES[tipo] ?? "bin"}`;
}

/**
 * Lo que dicen los primeros bytes, no lo que declara el navegador: cualquiera
 * puede mandar un HTML con el tipo "image/jpeg". JPEG empieza con FF D8 FF;
 * WebP con "RIFF", cuatro bytes de tamaño y "WEBP".
 */
export function pareceImagen(bytes: ArrayBuffer, tipo: string): boolean {
  const b = new Uint8Array(bytes.slice(0, 12));
  const ascii = (desde: number, hasta: number) => String.fromCharCode(...b.slice(desde, hasta));
  if (tipo === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (tipo === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
  return false;
}
