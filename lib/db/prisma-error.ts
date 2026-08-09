/**
 * Prisma-Fehlercodes ohne Import des Client-Namespaces (Client wird generiert).
 * https://www.prisma.io/docs/orm/reference/error-reference
 */
function errorCode(e: unknown): string {
  if (typeof e !== "object" || e === null || !("code" in e)) return "";
  const code = (e as { code?: unknown }).code;
  return typeof code === "string" ? code : "";
}

/** P2021/P2022: Tabelle bzw. Spalte fehlt — meist eine nicht deployte Migration. */
export function isMissingSchemaError(e: unknown): boolean {
  const code = errorCode(e);
  if (code === "P2021" || code === "P2022") return true;
  const msg = e instanceof Error ? e.message : "";
  return msg.includes("does not exist in the current database");
}

/** P2002: Unique-Verletzung. */
export function isUniqueViolationError(e: unknown): boolean {
  return errorCode(e) === "P2002";
}
