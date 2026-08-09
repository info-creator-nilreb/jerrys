export const CUSTOMER_PASSWORD_MIN_LENGTH = 10;
export const CUSTOMER_PASSWORD_MAX_LENGTH = 128;

export type PasswordValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/** Kurztext für Formular-Hilfe (Storefront). */
export const CUSTOMER_PASSWORD_REQUIREMENTS_HINT =
  "Mindestens 10 Zeichen, je ein Groß- und Kleinbuchstabe sowie eine Ziffer.";

export type CustomerPasswordCriterionId = "length" | "lowercase" | "uppercase" | "digit";

export type CustomerPasswordCriterionState = "idle" | "fail" | "partial" | "pass";

export type CustomerPasswordCriterion = {
  id: CustomerPasswordCriterionId;
  label: string;
  state: CustomerPasswordCriterionState;
};

/** Ab dieser Länge (noch unter Minimum) gilt das Längen-Kriterium als „fast erfüllt“ (orange). */
export const CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN = Math.max(
  4,
  Math.floor(CUSTOMER_PASSWORD_MIN_LENGTH * 0.5),
);

/**
 * Bewertet einzelne Passwort-Kriterien für Live-Feedback in Formularen (client-tauglich).
 */
export function getCustomerPasswordCriteria(password: string): CustomerPasswordCriterion[] {
  const hasInput = password.length > 0;

  const lengthState: CustomerPasswordCriterionState = !hasInput
    ? "idle"
    : password.length >= CUSTOMER_PASSWORD_MIN_LENGTH
      ? "pass"
      : password.length >= CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN
        ? "partial"
        : "fail";

  const lowercaseState: CustomerPasswordCriterionState = !hasInput
    ? "idle"
    : /[a-z]/.test(password)
      ? "pass"
      : "fail";

  const uppercaseState: CustomerPasswordCriterionState = !hasInput
    ? "idle"
    : /[A-Z]/.test(password)
      ? "pass"
      : "fail";

  const digitState: CustomerPasswordCriterionState = !hasInput
    ? "idle"
    : /[0-9]/.test(password)
      ? "pass"
      : "fail";

  return [
    {
      id: "length",
      label: `Mindestens ${CUSTOMER_PASSWORD_MIN_LENGTH} Zeichen`,
      state: lengthState,
    },
    { id: "lowercase", label: "Ein Kleinbuchstabe", state: lowercaseState },
    { id: "uppercase", label: "Ein Großbuchstabe", state: uppercaseState },
    { id: "digit", label: "Eine Ziffer", state: digitState },
  ];
}

export type CustomerPasswordStrengthTier = "idle" | "weak" | "fair" | "good" | "strong";

export type CustomerPasswordStrength = {
  tier: CustomerPasswordStrengthTier;
  /** Gefüllte Balken (0–4) für die Gesamtstärke */
  filledSegments: number;
  /** Kurzbeschreibung für Screenreader */
  label: string;
};

const PASSWORD_STRENGTH_SEGMENTS = 4;

/** Interne Punkte 0–6: Länge (3 Stufen) + Klein + Groß + Ziffer */
function customerPasswordStrengthPoints(password: string): number {
  if (password.length === 0) return 0;
  let points = 0;
  if (password.length >= 1) points += 1;
  if (password.length >= CUSTOMER_PASSWORD_LENGTH_PARTIAL_MIN) points += 1;
  if (password.length >= CUSTOMER_PASSWORD_MIN_LENGTH) points += 1;
  if (/[a-z]/.test(password)) points += 1;
  if (/[A-Z]/.test(password)) points += 1;
  if (/[0-9]/.test(password)) points += 1;
  return points;
}

function strengthTierFromPoints(points: number): CustomerPasswordStrengthTier {
  if (points <= 0) return "idle";
  if (points <= 2) return "weak";
  if (points <= 4) return "fair";
  if (points <= 5) return "good";
  return "strong";
}

function strengthLabel(tier: CustomerPasswordStrengthTier): string {
  switch (tier) {
    case "idle":
      return "Noch kein Passwort eingegeben";
    case "weak":
      return "Sehr schwach";
    case "fair":
      return "Schwach";
    case "good":
      return "Gut — Mindestanforderungen fast erfüllt";
    case "strong":
      return "Stark — Mindestanforderungen erfüllt";
  }
}

function filledSegmentsFromPoints(points: number): number {
  if (points <= 0) return 0;
  if (points === 1) return 1;
  if (points === 2) return 1;
  if (points === 3) return 2;
  if (points === 4) return 3;
  if (points === 5) return 3;
  return PASSWORD_STRENGTH_SEGMENTS;
}

/**
 * Gesamtstärke fürs Balken-Meter (unabhängig von der Einzel-Kriterien-Liste).
 */
export function getCustomerPasswordStrength(password: string): CustomerPasswordStrength {
  const points = customerPasswordStrengthPoints(password);
  const tier = strengthTierFromPoints(points);
  return {
    tier,
    filledSegments: filledSegmentsFromPoints(points),
    label: strengthLabel(tier),
  };
}

export const CUSTOMER_PASSWORD_STRENGTH_SEGMENT_COUNT = PASSWORD_STRENGTH_SEGMENTS;

/**
 * OWASP-taugliche Mindestanforderungen für Kundenpasswörter (ohne MFA):
 * Länge + Zeichenvielfalt, keine extrem kurzen oder nur-Buchstaben-Passwörter.
 */
export function validateCustomerPassword(password: string): PasswordValidationResult {
  if (password.length < CUSTOMER_PASSWORD_MIN_LENGTH) {
    return {
      ok: false,
      message: `Das Passwort muss mindestens ${CUSTOMER_PASSWORD_MIN_LENGTH} Zeichen haben.`,
    };
  }
  if (password.length > CUSTOMER_PASSWORD_MAX_LENGTH) {
    return {
      ok: false,
      message: `Das Passwort darf höchstens ${CUSTOMER_PASSWORD_MAX_LENGTH} Zeichen haben.`,
    };
  }
  if (!/[a-z]/.test(password)) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens einen Kleinbuchstaben enthalten.",
    };
  }
  if (!/[A-Z]/.test(password)) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens einen Großbuchstaben enthalten.",
    };
  }
  if (!/[0-9]/.test(password)) {
    return {
      ok: false,
      message: "Das Passwort muss mindestens eine Ziffer enthalten.",
    };
  }
  return { ok: true };
}
