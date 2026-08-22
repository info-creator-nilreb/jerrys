import { z } from "zod";

export const PDP_TRUST_BAR_ICONS = ["truck", "leaf", "headphones", "shield", "heart"] as const;
export type PdpTrustBarIcon = (typeof PDP_TRUST_BAR_ICONS)[number];

export type PdpTrustBarItem = {
  enabled: boolean;
  icon: PdpTrustBarIcon;
  title: string;
  subtitle: string | null;
  /** Bei Versand-Merkmal: „· ab X € Bestellwert“ aus Versandeinstellungen anhängen. */
  appendFreeShippingThreshold: boolean;
};

export const DEFAULT_PDP_RETURN_POLICY_TEXT = "30 Tage Rückgaberecht";

export const DEFAULT_PDP_TRUST_BAR_ITEMS: PdpTrustBarItem[] = [
  {
    enabled: true,
    icon: "truck",
    title: "Kostenloser Versand",
    subtitle: null,
    appendFreeShippingThreshold: true,
  },
  {
    enabled: true,
    icon: "leaf",
    title: "Klimaneutral verpackt",
    subtitle: null,
    appendFreeShippingThreshold: false,
  },
  {
    enabled: true,
    icon: "headphones",
    title: "Persönlicher Support",
    subtitle: null,
    appendFreeShippingThreshold: false,
  },
];

const pdpTrustBarItemSchema = z.object({
  enabled: z.boolean(),
  icon: z.enum(PDP_TRUST_BAR_ICONS),
  title: z.string().trim().min(1).max(80),
  subtitle: z
    .string()
    .trim()
    .max(120)
    .transform((s) => (s === "" ? null : s))
    .nullable()
    .optional()
    .default(null),
  appendFreeShippingThreshold: z.boolean().optional().default(false),
});

const pdpTrustBarItemsSchema = z
  .array(pdpTrustBarItemSchema)
  .length(3)
  .transform((items) =>
    items.map((item) => ({
      enabled: item.enabled,
      icon: item.icon,
      title: item.title,
      subtitle: item.subtitle ?? null,
      appendFreeShippingThreshold: item.appendFreeShippingThreshold ?? false,
    })),
  );

export function parsePdpTrustBarItems(raw: unknown): PdpTrustBarItem[] {
  const parsed = pdpTrustBarItemsSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  return DEFAULT_PDP_TRUST_BAR_ITEMS.map((item) => ({ ...item }));
}

export function parsePdpReturnPolicyText(raw: string | null | undefined): string | null {
  const t = raw?.trim() ?? "";
  return t === "" ? null : t.slice(0, 120);
}

export function pdpTrustBarItemsFromFormData(formData: FormData): PdpTrustBarItem[] {
  const items: PdpTrustBarItem[] = [];
  for (let i = 0; i < 3; i++) {
    const prefix = `pdpTrust${i}`;
    const enabled = formCheckbox(formData, `${prefix}Enabled`, true);
    const iconRaw = String(formData.get(`${prefix}Icon`) ?? "truck");
    const icon = PDP_TRUST_BAR_ICONS.includes(iconRaw as PdpTrustBarIcon)
      ? (iconRaw as PdpTrustBarIcon)
      : "truck";
    const title = String(formData.get(`${prefix}Title`) ?? "").trim();
    const subtitleRaw = String(formData.get(`${prefix}Subtitle`) ?? "").trim();
    const appendFreeShippingThreshold = formCheckbox(
      formData,
      `${prefix}AppendFreeShipping`,
      false,
    );
    items.push({
      enabled,
      icon,
      title: title || DEFAULT_PDP_TRUST_BAR_ITEMS[i]!.title,
      subtitle: subtitleRaw === "" ? null : subtitleRaw,
      appendFreeShippingThreshold,
    });
  }
  return parsePdpTrustBarItems(items);
}

function formCheckbox(formData: FormData, key: string, defaultWhenMissing: boolean): boolean {
  const values = formData.getAll(key).map(String);
  if (values.length === 0) return defaultWhenMissing;
  const last = values[values.length - 1]!;
  return last === "true" || last === "on" || last === "1";
}

export const pdpTrustSettingsSchema = z.object({
  pdpReturnPolicyText: z
    .string()
    .trim()
    .max(120)
    .transform((s) => (s === "" ? null : s))
    .nullable(),
  pdpTrustBarItems: pdpTrustBarItemsSchema,
});

export type PdpTrustSettings = z.infer<typeof pdpTrustSettingsSchema>;
