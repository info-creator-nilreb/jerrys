"use client";

import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/consent/constants";

type Props = {
  className?: string;
};

export function CookieSettingsButton({ className }: Props) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(OPEN_COOKIE_SETTINGS_EVENT));
        }
      }}
    >
      Cookie-Einstellungen
    </button>
  );
}
