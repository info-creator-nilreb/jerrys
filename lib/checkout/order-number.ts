import { randomBytes } from "crypto";

export function generateOrderNumber(): string {
  const n = randomBytes(3).toString("hex").toUpperCase();
  return `JR-${n}`;
}
