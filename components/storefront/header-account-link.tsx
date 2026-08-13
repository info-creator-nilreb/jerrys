import { Suspense } from "react";
import { User } from "lucide-react";
import { HeaderAccountPopover } from "@/components/storefront/header-account-popover";
import { getCustomerSession } from "@/lib/auth/customer-session";
import { createLogger } from "@/lib/logging/logger";

const log = createLogger("storefront.header-account");

function AccountIconFallback() {
  return (
    <span
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-(--foreground-heading)"
      aria-hidden
    >
      <User className="size-6" strokeWidth={1.75} />
    </span>
  );
}

async function HeaderAccountLinkInner() {
  let isLoggedIn = false;
  let email: string | null = null;
  try {
    const session = await getCustomerSession();
    if (session) {
      isLoggedIn = true;
      email = session.email;
    }
  } catch (e) {
    log.warn("customer_session_lookup_failed", { error: String(e) });
  }

  return <HeaderAccountPopover isLoggedIn={isLoggedIn} email={email} />;
}

/** Session-Lookup hinter Suspense — Shell ohne Cookie-Await. */
export function HeaderAccountLink() {
  return (
    <Suspense fallback={<AccountIconFallback />}>
      <HeaderAccountLinkInner />
    </Suspense>
  );
}
