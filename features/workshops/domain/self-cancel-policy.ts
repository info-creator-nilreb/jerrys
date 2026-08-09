import { isWorkshopBookingSelfCancellableStatus } from "@/features/workshops/domain/booking-status";

export type SelfCancelPolicyInput = {
  now: Date;
  sessionStartsAt: Date;
  globalSelfCancelHoursBeforeStart: number;
  sessionSelfCancelHoursBeforeStart: number | null;
  bookingStatus: string;
  sessionStatus: string;
};

export type SelfCancelPolicyResult = {
  allowed: boolean;
  deadlineAt: Date;
  reasonCode:
    | "allowed"
    | "deadline_passed"
    | "booking_not_cancellable"
    | "session_not_active";
};

/**
 * Fristende für Selbststornierung: Terminbeginn minus konfigurierte Stunden
 * (Termin-Override schlägt Shop-Default).
 */
export function resolveSelfCancelDeadline(input: {
  sessionStartsAt: Date;
  globalSelfCancelHoursBeforeStart: number;
  sessionSelfCancelHoursBeforeStart: number | null;
}): Date {
  const hours =
    input.sessionSelfCancelHoursBeforeStart ?? input.globalSelfCancelHoursBeforeStart;
  const ms = Math.max(0, hours) * 60 * 60 * 1000;
  return new Date(input.sessionStartsAt.getTime() - ms);
}

export function evaluateSelfCancelPolicy(input: SelfCancelPolicyInput): SelfCancelPolicyResult {
  const deadlineAt = resolveSelfCancelDeadline({
    sessionStartsAt: input.sessionStartsAt,
    globalSelfCancelHoursBeforeStart: input.globalSelfCancelHoursBeforeStart,
    sessionSelfCancelHoursBeforeStart: input.sessionSelfCancelHoursBeforeStart,
  });

  if (input.sessionStatus === "cancelled" || input.sessionStatus === "completed") {
    return { allowed: false, deadlineAt, reasonCode: "session_not_active" };
  }

  if (!isWorkshopBookingSelfCancellableStatus(input.bookingStatus)) {
    return { allowed: false, deadlineAt, reasonCode: "booking_not_cancellable" };
  }

  if (input.now.getTime() >= deadlineAt.getTime()) {
    return { allowed: false, deadlineAt, reasonCode: "deadline_passed" };
  }

  return { allowed: true, deadlineAt, reasonCode: "allowed" };
}

export function selfCancelPolicyUserMessage(result: SelfCancelPolicyResult): string {
  switch (result.reasonCode) {
    case "allowed":
      return "";
    case "deadline_passed":
      return "Die Stornierungsfrist ist abgelaufen. Bitte wende dich an unseren Support.";
    case "booking_not_cancellable":
      return "Diese Buchung kann online nicht mehr storniert werden.";
    case "session_not_active":
      return "Der Termin ist nicht mehr aktiv.";
    default:
      return "Stornierung derzeit nicht möglich.";
  }
}
