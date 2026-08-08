import Link from "next/link";
import { User } from "lucide-react";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("storefront.header-account");

export async function HeaderAccountLink() {
  let href = "/konto/anmelden";
  let label = "Anmelden";
  try {
    const session = await getCustomerSession();
    if (session) {
      href = "/konto";
      label = "Mein Konto";
    }
  } catch (e) {
    log.warn("customer_session_lookup_failed", { error: String(e) });
  }

  return (
    <Link
      href={href}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading) transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={label}
    >
      <User className="size-5" aria-hidden strokeWidth={1.5} />
    </Link>
  );
}
