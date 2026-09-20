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
    // Sin llamada inmediata acá: el primer pintado ya es el que mandó el
    // servidor (prop `initial`), y no hay que pisarlo apenas monta. Recién
    // se recalcula cuando pasa el primer minuto.
    const recalculate = () =>
      setStatus(getOpenStatus(new Date(), week, specials));
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
