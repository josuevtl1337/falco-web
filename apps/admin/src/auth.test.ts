import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
} from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { authenticate } from "./auth";

const TEAM = "falco";
const AUD = "aud-de-la-aplicacion";
const ISS = `https://${TEAM}.cloudflareaccess.com`;

let privada: CryptoKey;
let otraPrivada: CryptoKey;
let claves: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const par = await generateKeyPair("RS256");
  const otro = await generateKeyPair("RS256");
  privada = par.privateKey;
  otraPrivada = otro.privateKey;
  const publica: JWK = {
    ...(await exportJWK(par.publicKey)),
    kid: "k1",
    alg: "RS256",
  };
  claves = createLocalJWKSet({ keys: [publica] });
});

const token = (
  opciones: {
    aud?: string;
    iss?: string;
    vence?: string;
    clave?: CryptoKey;
    email?: string;
  } = {},
) =>
  new SignJWT(
    opciones.email === undefined
      ? { email: "duenio@falco.cafe" }
      : { email: opciones.email },
  )
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opciones.iss ?? ISS)
    .setAudience(opciones.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(opciones.vence ?? "1h")
    .sign(opciones.clave ?? privada);

const pedido = (jwt?: string, url = "https://admin.falcocafe.com.ar/") =>
  new Request(url, jwt ? { headers: { "Cf-Access-Jwt-Assertion": jwt } } : {});

const config = { team: TEAM, aud: AUD };

describe("el acceso al admin", () => {
  it("sin el token de Access, no entra", async () => {
    expect(await authenticate(pedido(), config, claves)).toEqual({ ok: false });
  });

  it("con un token bueno, entra con su mail", async () => {
    expect(await authenticate(pedido(await token()), config, claves)).toEqual({
      ok: true,
      email: "duenio@falco.cafe",
    });
  });

  it("un token firmado con otra clave no entra", async () => {
    const r = await authenticate(
      pedido(await token({ clave: otraPrivada })),
      config,
      claves,
    );
    expect(r.ok).toBe(false);
  });

  it("un token de otra aplicación de Access no entra", async () => {
    const r = await authenticate(
      pedido(await token({ aud: "otra" })),
      config,
      claves,
    );
    expect(r.ok).toBe(false);
  });

  it("un token de otro equipo no entra", async () => {
    const r = await authenticate(
      pedido(await token({ iss: "https://otro.cloudflareaccess.com" })),
      config,
      claves,
    );
    expect(r.ok).toBe(false);
  });

  it("un token vencido no entra", async () => {
    const r = await authenticate(
      pedido(await token({ vence: "-1m" })),
      config,
      claves,
    );
    expect(r.ok).toBe(false);
  });

  it("un token sin mail no entra", async () => {
    const r = await authenticate(
      pedido(await token({ email: "" })),
      config,
      claves,
    );
    expect(r.ok).toBe(false);
  });

  it("si faltan los datos de la aplicación, no entra nadie", async () => {
    const r = await authenticate(
      pedido(await token()),
      { team: "", aud: "" },
      claves,
    );
    expect(r.ok).toBe(false);
  });

  describe("en la computadora de desarrollo", () => {
    it("con ADMIN_DEV_EMAIL y desde localhost, entra con ese mail", async () => {
      const r = await authenticate(
        pedido(undefined, "http://localhost:4322/"),
        { devEmail: "yo@falco.cafe" },
      );
      expect(r).toEqual({ ok: true, email: "yo@falco.cafe" });
    });

    it("ADMIN_DEV_EMAIL no sirve fuera de localhost", async () => {
      const r = await authenticate(
        pedido(undefined, "https://admin.falcocafe.com.ar/"),
        { ...config, devEmail: "yo@falco.cafe" },
        claves,
      );
      expect(r.ok).toBe(false);
    });
  });
});
