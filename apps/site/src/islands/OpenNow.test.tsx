// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { OpenNow } from "./OpenNow";

const WEEK = {
  0: { shifts: [] },
  1: { shifts: [{ opensAt: "08:00", closesAt: "20:00" }] },
  2: { shifts: [{ opensAt: "08:00", closesAt: "20:00" }] },
  3: { shifts: [{ opensAt: "08:00", closesAt: "20:00" }] },
  4: { shifts: [{ opensAt: "08:00", closesAt: "20:00" }] },
  5: { shifts: [{ opensAt: "08:00", closesAt: "20:00" }] },
  6: { shifts: [{ opensAt: "09:00", closesAt: "13:00" }] },
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("OpenNow", () => {
  it("muestra el estado del servidor cuando todavía es el correcto", () => {
    vi.useFakeTimers();
    // Lunes 12:00 en Argentina (UTC-3) = 15:00 UTC: el local está abierto.
    vi.setSystemTime(new Date("2026-09-21T15:00:00Z"));
    render(
      <OpenNow
        week={WEEK}
        specials={[]}
        initial={{
          state: "open",
          closesAt: "20:00",
          label: "Abierto ahora · cierra 20:00",
        }}
      />,
    );
    expect(screen.getByText("Abierto ahora · cierra 20:00")).toBeTruthy();
  });

  it("corrige el cartel si el HTML venía cacheado con un estado viejo", () => {
    vi.useFakeTimers();
    // Domingo: cerrado. Pero el HTML llegó del borde diciendo "Abierto ahora",
    // porque se calculó hasta 60 segundos antes.
    vi.setSystemTime(new Date("2026-09-20T15:00:00Z"));
    render(
      <OpenNow
        week={WEEK}
        specials={[]}
        initial={{
          state: "open",
          closesAt: "20:00",
          label: "Abierto ahora · cierra 20:00",
        }}
      />,
    );
    const badge = screen.getByRole("status");
    expect(badge.textContent).toContain("Cerrado");
    expect(badge.getAttribute("data-open")).toBe("false");
  });

  it("se recalcula solo cuando pasa un minuto", () => {
    vi.useFakeTimers();
    // Lunes 19:59 en Argentina (UTC-3) = 22:59 UTC.
    vi.setSystemTime(new Date("2026-09-21T22:59:30Z"));
    render(
      <OpenNow
        week={WEEK}
        specials={[]}
        initial={{
          state: "open",
          closesAt: "20:00",
          label: "Abierto ahora · cierra 20:00",
        }}
      />,
    );
    expect(screen.getByRole("status").textContent).toContain("Abierto ahora");
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByRole("status").textContent).toContain("Cerrado");
  });

  it("nunca usa la zona horaria del dispositivo", () => {
    // El dominio ya fuerza America/Argentina/Buenos_Aires; la isla no debe
    // construir fechas locales por su cuenta.
    const source = OpenNow.toString();
    expect(source).not.toContain("getHours(");
    expect(source).not.toContain("toLocaleTimeString(");
  });
});
