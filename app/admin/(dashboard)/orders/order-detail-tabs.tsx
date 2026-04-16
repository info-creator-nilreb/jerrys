"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

const TAB_IDS = ["allgemein", "zahlung", "verlauf", "dokumente"] as const;
export type AdminOrderDetailTabId = (typeof TAB_IDS)[number];

const TAB_LABELS: Record<AdminOrderDetailTabId, string> = {
  allgemein: "Allgemein",
  zahlung: "Zahlungsinformationen",
  verlauf: "Verlauf",
  dokumente: "Dokumente",
};

function parseTab(raw: string | null): AdminOrderDetailTabId {
  if (raw && (TAB_IDS as readonly string[]).includes(raw)) {
    return raw as AdminOrderDetailTabId;
  }
  return "allgemein";
}

export function OrderDetailTabs({
  allgemein,
  zahlung,
  verlauf,
  dokumente,
}: {
  allgemein: React.ReactNode;
  zahlung: React.ReactNode;
  verlauf: React.ReactNode;
  dokumente: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initial = useMemo(() => parseTab(searchParams.get("tab")), [searchParams]);
  const [active, setActive] = useState<AdminOrderDetailTabId>(initial);

  useEffect(() => {
    setActive(parseTab(searchParams.get("tab")));
  }, [searchParams]);

  const selectTab = useCallback(
    (id: AdminOrderDetailTabId) => {
      setActive(id);
      const next = new URLSearchParams(searchParams.toString());
      if (id === "allgemein") {
        next.delete("tab");
      } else {
        next.set("tab", id);
      }
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const panels: Record<AdminOrderDetailTabId, React.ReactNode> = {
    allgemein,
    zahlung,
    verlauf,
    dokumente,
  };

  return (
    <div>
      <div
        role="tablist"
        aria-label="Bestelldetails"
        className="flex flex-wrap gap-1 border-b border-[#e8eaed]"
      >
        {TAB_IDS.map((id) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              id={`order-tab-${id}`}
              aria-selected={isActive}
              aria-controls={`order-tabpanel-${id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => selectTab(id)}
              className={`relative -mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-[#6b7280] hover:text-[#374151]"
              }`}
            >
              {TAB_LABELS[id]}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`order-tabpanel-${active}`}
        aria-labelledby={`order-tab-${active}`}
        className="pt-6"
      >
        {panels[active]}
      </div>
    </div>
  );
}
