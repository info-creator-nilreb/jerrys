/** 6-stellig, Großbuchstaben und Ziffern (ohne I,O,0,1 zur Lesbarkeit). */
export function generateRandomPromotionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += chars[Math.floor(Math.random() * chars.length)]!;
  }
  return s;
}
