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

  return (
    <p
      role="status"
      data-open={status.state === "open"}
      className="abierto-ahora"
    >
      <span className="punto" aria-hidden="true" />
      {status.label}
    </p>
  );
}
