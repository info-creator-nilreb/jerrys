"use server";

import { getAdminSession } from "@/lib/auth/admin-session";
import {
  updateInfoBannerFromFormData,
  type UpdateInfoBannerResult,
} from "@/lib/shop/update-info-banner";

export type InfoBannerSavedSnapshot = {
  active: boolean;
  messages: string[];
  durationSec: number;
  href: string | null;
  bgColor: string | null;
};

export type InfoBannerFormState = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  saved?: InfoBannerSavedSnapshot;
} | null;

export async function saveInfoBannerAction(
  _prev: InfoBannerFormState,
  formData: FormData,
): Promise<InfoBannerFormState> {
  const session = await getAdminSession();
  if (!session?.user) {
    return { ok: false, error: "Nicht angemeldet." };
  }
  const result: UpdateInfoBannerResult = await updateInfoBannerFromFormData(formData);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      fieldErrors: result.fieldErrors,
    };
  }
  return {
    ok: true,
    saved: {
      active: result.settings.infoBannerActive,
      messages: result.settings.infoBannerMessages,
      durationSec: result.settings.infoBannerDurationSec,
      href: result.settings.infoBannerHref,
      bgColor: result.settings.infoBannerBgColor,
    },
  };
}
