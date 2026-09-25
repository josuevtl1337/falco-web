import { describe, expect, it } from "vitest";
import { cartaRedirect } from "./carta";

describe("la redirección a la carta", () => {
  it("redirige con 302, nunca con 301", () => {
    const response = cartaRedirect("https://drive.google.com/file/d/abc/view");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://drive.google.com/file/d/abc/view",
    );
  });

  it("sin link cargado, no redirige a cualquier lado", () => {
    expect(cartaRedirect(undefined).status).toBe(404);
  });

  it("no redirige a un link que no sea https", () => {
    expect(
      cartaRedirect("http://drive.google.com/file/d/abc/view").status,
    ).toBe(404);
  });

  it("nunca se puede cachear: el link cambia cuando Falco sube otra carta", () => {
    const response = cartaRedirect("https://drive.google.com/file/d/abc/view");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
