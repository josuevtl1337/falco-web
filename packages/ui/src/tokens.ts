export const colors = {
  carbon: "#292A2C",
  piedra: "#313335",
  sombra: "#1E1F21",
  tostado: "#885333",
  hueso: "#E8E2D0",
  ceniza: "#9A9C9E",
  brasa: "#F2C48B",
} as const;

/** Grados. Son fijos: no inventar ángulos nuevos. */
export const angles = {
  plate: -14,
  button: -12,
  menu: -8,
  dialog: -6,
  ticker: -1.6,
} as const;

export const easing = {
  persona: "cubic-bezier(0.2, 1.2, 0.4, 1)",
  ambient: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;

export const fonts = {
  display:
    '"Bricolage Grotesque Variable", "Bricolage Grotesque", "Arial Narrow", system-ui, sans-serif',
  body: '"Instrument Sans", system-ui, sans-serif',
  mono: '"Martian Mono", ui-monospace, "SFMono-Regular", monospace',
} as const;

export const space = {
  xs: "4px",
  sm: "8px",
  md: "16px",
  lg: "24px",
  xl: "40px",
  xxl: "72px",
} as const;

export const text = {
  nano: "10px",
  micro: "12px",
  small: "14px",
  body: "16px",
  lead: "20px",
  title: "28px",
  display: "44px",
  dia: "72px",
  diaMes: "38px",
  hero: "clamp(56px, 9vw, 112px)",
  // Unidades del viewBox del pentágono, no píxeles de página (ver tokens.css).
  svg: "5px",
} as const;

export const radius = { sm: "4px", md: "8px", lg: "16px" } as const;

export const duration = {
  quick: "120ms",
  base: "240ms",
  slow: "520ms",
} as const;

// Nada que se toque puede ser más chico que esto (spec 6.3).
export const touch = { min: "44px" } as const;
