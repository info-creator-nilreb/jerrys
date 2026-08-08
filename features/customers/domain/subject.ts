export const AUTH_SUBJECT_KINDS = ["admin", "customer"] as const;

export type AuthSubjectKind = (typeof AUTH_SUBJECT_KINDS)[number];

export function isAuthSubjectKind(value: unknown): value is AuthSubjectKind {
  return value === "admin" || value === "customer";
}

/** Legacy admin JWTs omit subjectKind — treat as admin. */
export function resolveAuthSubjectKind(value: unknown): AuthSubjectKind {
  if (value === "customer") return "customer";
  return "admin";
}
