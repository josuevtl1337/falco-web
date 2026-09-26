import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Quién está usando el admin.
 *
 * Cloudflare Access pide el login (código por mail, a una lista de mails
 * permitidos) antes de dejar pasar a nadie, y agrega en cada pedido un token
 * firmado: `Cf-Access-Jwt-Assertion`. Igual se valida acá, en cada pedido: si
 * alguien llegara al Worker salteando Access, no tendría ese token firmado y
 * se queda afuera.
 */

export type AuthConfig = {
  /** El equipo de Cloudflare Zero Trust: <equipo>.cloudflareaccess.com */
  team?: string;
  /** El "Application Audience (AUD) Tag" de la aplicación de Access. */
  aud?: string;
  /** Sólo en desarrollo, desde localhost: el mail con el que se entra. */
  devEmail?: string;
};

export type AuthResult = { ok: true; email: string } | { ok: false };

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Las claves públicas de Access cambian cada tanto: createRemoteJWKSet las
// baja una vez y las guarda, así que se arma una sola vez por equipo.
const keySets = new Map<string, JWTVerifyGetKey>();
const keysFor = (team: string): JWTVerifyGetKey => {
  let keys = keySets.get(team);
  if (!keys) {
    keys = createRemoteJWKSet(
      new URL(`https://${team}.cloudflareaccess.com/cdn-cgi/access/certs`),
    );
    keySets.set(team, keys);
  }
  return keys;
};

export async function authenticate(
  request: Request,
  config: AuthConfig,
  /** Para los tests: claves locales en vez de pedirlas a Cloudflare. */
  keys?: JWTVerifyGetKey,
): Promise<AuthResult> {
  const url = new URL(request.url);
  if (config.devEmail && LOCAL_HOSTS.has(url.hostname)) {
    return { ok: true, email: config.devEmail };
  }

  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token || !config.team || !config.aud) return { ok: false };

  try {
    const { payload } = await jwtVerify(token, keys ?? keysFor(config.team), {
      issuer: `https://${config.team}.cloudflareaccess.com`,
      audience: config.aud,
    });
    const email = typeof payload.email === "string" ? payload.email : "";
    return email ? { ok: true, email } : { ok: false };
  } catch {
    // Firma que no corresponde, vencido, de otra aplicación: da igual el
    // motivo, no entra. No se le cuenta a quien pide por qué.
    return { ok: false };
  }
}
