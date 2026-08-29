"use client";

import {
  CMS_LINK_TARGET_CUSTOM_VALUE,
  CMS_LINK_TARGET_EXTERNAL_VALUE,
  groupedCmsLinkTargetOptions,
  resolveCmsLinkTargetSelectValue,
  type CmsLinkTargetOption,
} from "@/lib/content/cms-link-target-options";

const fieldClass =
  "mt-1 w-full rounded-md border border-[#e3e4e8] px-3 py-2 text-sm text-[#1f2937] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25";

type Props = {
  label: string;
  href: string;
  onChange: (href: string) => void;
  options: CmsLinkTargetOption[];
  allowEmpty?: boolean;
  emptyLabel?: string;
  allowExternal?: boolean;
  customPlaceholder?: string;
  externalPlaceholder?: string;
};

export function CmsLinkTargetField({
  label,
  href,
  onChange,
  options,
  allowEmpty = false,
  emptyLabel = "Keine",
  allowExternal = false,
  customPlaceholder = "/ueber-uns",
  externalPlaceholder = "https://…",
}: Props) {
  const selectValue = resolveCmsLinkTargetSelectValue(href, options, { allowExternal });
  const grouped = groupedCmsLinkTargetOptions(options);

  return (
    <div className="space-y-2">
      <label className="text-sm text-[#5c5f66]">
        {label}
        <select
          className={fieldClass}
          value={selectValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "") {
              onChange("");
              return;
            }
            if (v === CMS_LINK_TARGET_CUSTOM_VALUE) {
              const current = href.trim();
              const isKnown = options.some((o) => o.href === current);
              onChange(isKnown || !current ? "/" : current);
              return;
            }
            if (v === CMS_LINK_TARGET_EXTERNAL_VALUE) {
              const current = href.trim();
              onChange(current.startsWith("https://") ? current : "https://");
              return;
            }
            onChange(v);
          }}
        >
          {allowEmpty ? <option value="">{emptyLabel}</option> : null}
          {grouped.map((group) => (
            <optgroup key={group.group} label={group.label}>
              {group.options.map((option) => (
                <option key={option.href} value={option.href}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
          {allowExternal ? (
            <option value={CMS_LINK_TARGET_EXTERNAL_VALUE}>Externe HTTPS-URL…</option>
          ) : null}
          <option value={CMS_LINK_TARGET_CUSTOM_VALUE}>Eigener Pfad…</option>
        </select>
      </label>

      {selectValue === CMS_LINK_TARGET_CUSTOM_VALUE ? (
        <label className="block text-sm text-[#5c5f66]">
          Eigener Pfad (intern, mit /)
          <input
            className={fieldClass}
            value={href}
            onChange={(e) => onChange(e.target.value)}
            placeholder={customPlaceholder}
          />
        </label>
      ) : null}

      {allowExternal && selectValue === CMS_LINK_TARGET_EXTERNAL_VALUE ? (
        <label className="block text-sm text-[#5c5f66]">
          Externe URL (HTTPS)
          <input
            className={fieldClass}
            value={href}
            onChange={(e) => onChange(e.target.value)}
            placeholder={externalPlaceholder}
          />
        </label>
      ) : null}
    </div>
  );
}
