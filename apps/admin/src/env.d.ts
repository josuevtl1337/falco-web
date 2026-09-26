/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference path="../worker-configuration.d.ts" />

declare namespace App {
  interface Locals {
    /** Quién está usando el admin: el mail del login de Cloudflare Access. */
    email: string;
  }
}
