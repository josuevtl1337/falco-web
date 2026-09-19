const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const ORDER_CODE_PATTERN = /^F-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/;

export function generateOrderCode(random: () => number = Math.random): string {
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return `F-${suffix}`;
}
