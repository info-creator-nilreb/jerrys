"use client";

import { useState } from "react";
import { PromotionTypeModal } from "@/components/admin/promotions/promotion-type-modal";

export function PromotionsToolbar({ label = "Promotion erstellen" }: { label?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-(--primary-hover)"
      >
        {label}
      </button>
      <PromotionTypeModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
