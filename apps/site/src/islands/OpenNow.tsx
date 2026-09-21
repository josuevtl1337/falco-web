import { useEffect, useState } from "react";
import {
  getOpenStatus,
  type OpenStatus,
  type SpecialDay,
  type WeekHours,
} from "@falco/domain";

type Props = {
  week: WeekHours;
  specials: SpecialDay[];
  /** El estado ya calculado en el servidor: la primera pintura no espera al JS. */
  initial: OpenStatus;
};

export function OpenNow({ week, specials, initial }: Props) {
  // getOpenStatus devuelve un objeto { state, label, … }, no un texto suelto:
  // el estado sale de `state`, nunca de leer el texto con startsWith.
  const [status, setStatus] = useState<OpenStatus>(initial);

  useEffect(() => {
    const recalculate = () =>
      setStatus(getOpenStatus(new Date(), week, specials));
    // Se recalcula apenas monta, y no solo cada minuto: el HTML se cachea 60
    // segundos en el borde, así que el estado que calculó el servidor puede
    // llegar atrasado. Esto no afecta el primer pintado —los efectos corren
    // después— pero corrige enseguida un cartel que ya no dice la verdad.
    recalculate();
    const timer = setInterval(recalculate, 60_000);
    return () => clearInterval(timer);
  }, [week, specials]);

  // Solo se parte el texto para el estilo (el chip encendido lleva el
  // detalle en un tono más apagado): el contenido completo sigue siendo el
  // mismo `status.label` que ya calculó getOpenStatus.
  const open = status.state === "open";
  const [primary, ...rest] = status.label.split(" · ");
  const sub = rest.length > 0 ? rest.join(" · ") : null;

  return (
    <p
      role="status"
      data-open={open}
      className={`chip estado ${open ? "chip--lit" : "chip--fill"}`}
    >
      <span className="punto" aria-hidden="true" />
      <span className="estado__label">{primary}</span>
      {sub && <span className="estado__sub"> · {sub}</span>}
    </p>
  );
}
