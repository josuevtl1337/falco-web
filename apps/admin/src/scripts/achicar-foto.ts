/**
 * La foto se achica en el celular antes de subirla: 1200 px de lado mayor y
 * WebP (o JPEG si el navegador no sabe escribir WebP). Una foto de 6 MB llega
 * como ~150 KB, se sube rápido con datos móviles y la tienda carga liviana.
 */

const LADO_MAXIMO = 1200;

const aBlob = (canvas: HTMLCanvasElement, tipo: string, calidad: number) =>
  new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, tipo, calidad));

export async function achicar(archivo: Blob): Promise<Blob> {
  // imageOrientation: la foto sale derecha aunque el celular la haya sacado de costado.
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")?.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();

  const webp = await aBlob(canvas, "image/webp", 0.82);
  // Safari viejo no escribe WebP: toBlob devuelve PNG. Ahí va JPEG.
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await aBlob(canvas, "image/jpeg", 0.85);
  if (!jpeg) throw new Error("No se pudo preparar la foto.");
  return jpeg;
}

export const conectarFoto = (): void => {
  const form = document.querySelector<HTMLFormElement>("[data-foto]");
  const input = form?.querySelector<HTMLInputElement>("[data-foto-archivo]");
  const estado = form?.querySelector<HTMLElement>("[data-foto-estado]");
  if (!form || !input) return;

  input.addEventListener("change", async () => {
    const archivo = input.files?.[0];
    if (!archivo) return;
    if (estado) estado.textContent = "Achicando la foto…";
    try {
      const chica = await achicar(archivo);
      if (estado) estado.textContent = `Subiendo (${Math.round(chica.size / 1024)} KB)…`;
      const datos = new FormData();
      datos.append("foto", new File([chica], "foto", { type: chica.type }));
      const respuesta = await fetch(form.action, { method: "POST", body: datos });
      // El servidor responde con una redirección a la ficha, con el aviso.
      location.href = respuesta.url;
    } catch {
      if (estado) estado.textContent = "No se pudo preparar la foto. Probá con otra.";
    }
  });
};
