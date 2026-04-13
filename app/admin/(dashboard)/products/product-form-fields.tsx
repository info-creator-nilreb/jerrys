"use client";

import type { ProductFormState } from "@/app/admin/(dashboard)/products/actions";
import { ProductDeliveryFields } from "@/app/admin/(dashboard)/products/product-delivery-fields";
import { ProductGeneralFields } from "@/app/admin/(dashboard)/products/product-general-fields";
import { ProductPricesSection } from "@/app/admin/(dashboard)/products/product-prices-section";
import { ProductStorefrontDetailFields } from "@/app/admin/(dashboard)/products/product-storefront-detail-fields";

type Mfr = { id: string; name: string };

type Props = {
  state: ProductFormState;
  manufacturers: Mfr[];
};

export function ProductFormFields({ state, manufacturers }: Props) {
  const fe = state?.fieldErrors ?? {};

  return (
    <div className="flex flex-col gap-8">
      <ProductGeneralFields
        state={state}
        manufacturers={manufacturers}
        defaults={{
          title: "",
          slug: "",
          subtitle: "",
          descriptionHtml: "",
          manufacturerId: null,
          productNumber: null,
          amazonRatingAverage: "",
          amazonRatingCount: "",
          amazonReviewUrl: "",
        }}
      />

      <ProductStorefrontDetailFields
        state={state}
        defaults={{
          categoryTag: "",
          isBestseller: false,
          leadText: "",
          dimensionsText: "",
          weightText: "",
          materialText: "",
          featureBullets: "",
        }}
      />

      <ProductPricesSection
        defaultTaxPercent={19}
        mainGrossCents={0}
        mainNetCents={0}
        listGrossCents={null}
        listNetCents={null}
        low30GrossCents={null}
        low30NetCents={null}
        fieldErrors={state?.fieldErrors}
      />

      <ProductDeliveryFields
        state={state}
        defaults={{
          stockQuantity: 0,
          availableQuantity: 0,
          deliveryTimeKey: "2-4-werktage",
          restockDays: null,
          minOrderQty: 1,
          purchaseStep: 1,
          maxOrderQty: null,
        }}
      />

      <section className="rounded-xl border border-[#e8eaed] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#1f2937]">Erstes Bild</h2>
        <p className="mt-1 text-sm text-[#6b7280]">
          Pfad unter <code className="text-xs">public/</code>, z. B.{" "}
          <code className="text-xs">/media/katzenhoehle.jpg</code>
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="imageUrl" className="text-xs font-medium text-[#6b7280]">
              Bild-URL
            </label>
            <input
              id="imageUrl"
              name="imageUrl"
              type="text"
              required
              placeholder="/media/…"
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
            {fe.imageUrl ? <p className="text-sm text-red-600">{fe.imageUrl}</p> : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="imageAlt" className="text-xs font-medium text-[#6b7280]">
              Bild-Alternativtext
            </label>
            <input
              id="imageAlt"
              name="imageAlt"
              type="text"
              required
              className="rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
            />
            {fe.imageAlt ? <p className="text-sm text-red-600">{fe.imageAlt}</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
