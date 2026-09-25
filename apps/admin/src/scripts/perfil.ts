import { PENTAGON_AXES, pentagonPolygon, type TastingProfile } from "@falco/ui/pentagono";

/** El pentágono se redibuja apenas se toca un valor, con la geometría del sitio. */
export const conectarPerfil = (): void => {
  const form = document.querySelector<HTMLElement>("[data-perfil-form]");
  const poligono = form?.querySelector<SVGPolygonElement>("[data-perfil]");
  if (!form || !poligono) return;

  form.addEventListener("change", () => {
    const perfil = {} as TastingProfile;
    for (const eje of PENTAGON_AXES) {
      const elegido = form.querySelector<HTMLInputElement>(`input[name="${eje}"]:checked`);
      perfil[eje] = Number(elegido?.value ?? 1);
    }
    poligono.setAttribute("points", pentagonPolygon(perfil));
  });
};
