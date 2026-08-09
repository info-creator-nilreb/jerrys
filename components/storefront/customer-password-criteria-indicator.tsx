"use client";

import { useMemo } from "react";
import {
  CUSTOMER_PASSWORD_REQUIREMENTS_HINT,
  CUSTOMER_PASSWORD_STRENGTH_SEGMENT_COUNT,
  getCustomerPasswordCriteria,
  getCustomerPasswordStrength,
  type CustomerPasswordCriterionState,
  type CustomerPasswordStrengthTier,
} from "@/features/customers/password";

function strengthBarClass(tier: CustomerPasswordStrengthTier, filled: boolean): string {
  if (!filled) return "bg-[#e5e7eb]";
  switch (tier) {
    case "strong":
      return "bg-(--semantic-success,#008060)";
    case "good":
      return "bg-amber-500";
    case "fair":
      return "bg-amber-500";
    case "weak":
      return "bg-red-500";
    default:
      return "bg-[#e5e7eb]";
  }
}

function labelClass(state: CustomerPasswordCriterionState): string {
  switch (state) {
    case "pass":
      return "text-(--semantic-success,#008060)";
    case "partial":
      return "text-amber-700";
    case "fail":
      return "text-red-600";
    default:
      return "text-(--foreground-muted)";
  }
}

function criterionStatusText(state: CustomerPasswordCriterionState): string {
  switch (state) {
    case "pass":
      return "erfüllt";
    case "partial":
      return "fast erfüllt";
    case "fail":
      return "offen";
    default:
      return "noch nicht geprüft";
  }
}

export function CustomerPasswordCriteriaIndicator({
  password,
  id,
  showWhenEmpty = false,
}: {
  password: string;
  /** Für aria-describedby am Passwort-Feld */
  id: string;
  /** Wenn false, nur Kurzhinweis solange das Feld leer ist */
  showWhenEmpty?: boolean;
}) {
  const criteria = useMemo(() => getCustomerPasswordCriteria(password), [password]);
  const strength = useMemo(() => getCustomerPasswordStrength(password), [password]);
  const hasInput = password.length > 0;

  if (!hasInput && !showWhenEmpty) {
    return (
      <p id={id} className="mt-2 text-xs text-(--foreground-muted)">
        {CUSTOMER_PASSWORD_REQUIREMENTS_HINT}
      </p>
    );
  }

  return (
    <div id={id} className="mt-2">
      <div
        className="flex gap-1"
        role="img"
        aria-label={`Passwortstärke: ${strength.label}`}
      >
        {Array.from({ length: CUSTOMER_PASSWORD_STRENGTH_SEGMENT_COUNT }, (_, index) => {
          const filled = index < strength.filledSegments;
          return (
            <div
              key={index}
              className={`h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-200 ${strengthBarClass(strength.tier, filled)}`}
            />
          );
        })}
      </div>
      <p className="sr-only" aria-live="polite">
        {strength.label}
      </p>
      <ul className="mt-2 space-y-1" aria-live="polite">
        {criteria.map((criterion) => (
          <li
            key={criterion.id}
            className={`flex items-center justify-between gap-2 text-xs ${labelClass(criterion.state)}`}
          >
            <span>{criterion.label}</span>
            <span className="sr-only">{criterionStatusText(criterion.state)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
