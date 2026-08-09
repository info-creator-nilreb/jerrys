"use client";

import { useMemo } from "react";
import {
  CUSTOMER_PASSWORD_REQUIREMENTS_HINT,
  getCustomerPasswordCriteria,
  type CustomerPasswordCriterionState,
} from "@/features/customers/password";

function segmentClass(state: CustomerPasswordCriterionState): string {
  switch (state) {
    case "pass":
      return "bg-(--semantic-success,#008060)";
    case "partial":
      return "bg-amber-500";
    case "fail":
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
        aria-label="Passwort-Anforderungen: farbige Balken pro Kriterium"
      >
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className={`h-1.5 min-w-0 flex-1 rounded-full transition-colors duration-200 ${segmentClass(criterion.state)}`}
            title={criterion.label}
          />
        ))}
      </div>
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
