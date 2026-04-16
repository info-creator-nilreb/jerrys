"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyTextButton({
  text,
  label,
  className = "",
}: {
  text: string;
  label: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className={`inline-flex shrink-0 items-center justify-center rounded-md border border-[#e5e7eb] bg-white p-1.5 text-[#6b7280] hover:bg-[#f9fafb] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
      aria-label={label}
    >
      {copied ? <Check className="size-4 text-primary" aria-hidden /> : <Copy className="size-4" aria-hidden />}
    </button>
  );
}
