"use client";

import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";

type Props = {
  state: ProductFormState;
  defaultText: string;
};

/**
 * Shopify-ähnliche Merkmale: Label + Mehrfachwerte (eine Zeile pro Merkmal).
 * Format: `key|Label: wert1, wert2` — der Key bleibt beim Re-Import stabil.
 */
export function ProductAttributesFields({ state, defaultText }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-[#1f2937]">Merkmale</h2>
      <p className="mt-1 text-sm text-[#6b7280]">
        Kategorie- und Custom-Attribute analog Shopify (Farbe, Material, Design …). Mehrere Werte
        kommagetrennt. Kein automatisches Vorschlags-System.
      </p>
      <div className="mt-6 h-px bg-[#e8eaed]" />
      <div className="mt-6 flex flex-col gap-1">
        <label htmlFor="attributesText" className="text-xs font-medium text-[#6b7280]">
          Merkmale (eine Zeile pro Eintrag)
        </label>
        <textarea
          id="attributesText"
          name="attributesText"
          rows={8}
          defaultValue={defaultText}
          placeholder={
            "custom.farbe|Farbe: beige, schwarz, gold\nshopify.jewelry-material|Schmuckmaterial: Gold, Perlen"
          }
          className="resize-y rounded-md border border-[#e5e7eb] bg-white px-3 py-2 font-mono text-sm"
        />
        {fe.attributesText ? (
          <p className="text-sm text-red-600">{fe.attributesText}</p>
        ) : null}
        <p className="text-xs text-[#6b7280]">
          Format: <code className="text-[0.7rem]">schlüssel|Label: wert1, wert2</code>. Maximal 40
          Merkmale.
        </p>
      </div>
    </section>
  );
}
