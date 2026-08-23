"use client";

import type { CSSProperties } from "react";
import { OPEN_COOKIE_SETTINGS_EVENT } from "@/lib/consent/constants";

type Props = {
  className?: string;
  style?: CSSProperties;
};

export function CookieSettingsButton({ className, style }: Props) {
  return (
    <button
      type="button"
      className={className}
      style={style}
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
