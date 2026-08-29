"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateProduct,
  type ProductFormState,
} from "@/app/admin/(dashboard)/products/actions";
import { ProductAttributesFields } from "@/app/admin/(dashboard)/products/product-attributes-fields";
import { ProductAiTextAssistant } from "@/app/admin/(dashboard)/products/product-ai-text-assistant";
import { ProductAiImageAssistant } from "@/app/admin/(dashboard)/products/product-ai-image-assistant";
import { ProductDeliveryFields } from "@/app/admin/(dashboard)/products/product-delivery-fields";
import { ProductGeneralFields } from "@/app/admin/(dashboard)/products/product-general-fields";
import { ProductPricesSection } from "@/app/admin/(dashboard)/products/product-prices-section";
import { ProductMediaSection } from "@/app/admin/(dashboard)/products/product-media-section";
import { ProductShopAssignmentFields } from "@/app/admin/(dashboard)/products/product-shop-assignment-fields";
import { ProductStorefrontDetailFields } from "@/app/admin/(dashboard)/products/product-storefront-detail-fields";
import { ProductUspFields } from "@/app/admin/(dashboard)/products/product-usp-fields";
import { ProductVariantsSection } from "@/app/admin/(dashboard)/products/product-variants-section";
import { AdminFormActionDock } from "@/components/admin/admin-form-action-dock";
import type { ProductAttribute } from "@/features/catalog";
import {
  resolveSelectedShopAssignment,
  type AdminShopAssignmentOption,
} from "@/lib/catalog/product-shop-assignment";

function plainDescriptionToHtml(description: string | null): string {
  if (!description?.trim()) return "";
  const t = description.trim();
  if (t.startsWith("<")) return t;
  const esc = t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "</p><p>");
  return `<p>${esc}</p>`;
}

type Manufacturer = { id: string; name: string };

type Product = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  manufacturerId: string | null;
  productNumber: string | null;
  priceGrossCents: number;
  priceNetCents: number;
  taxRatePercent: number;
  listPriceGrossCents: number | null;
  listPriceNetCents: number | null;
  lowestPrice30dGrossCents: number | null;
  lowestPrice30dNetCents: number | null;
  stockQuantity: number;
  availableQuantity: number;
  deliveryTimeKey: string | null;
  restockDays: number | null;
  minOrderQty: number;
  purchaseStep: number;
  maxOrderQty: number | null;
  isActive: boolean;
  amazonRatingAverage: number | null;
  amazonRatingCount: number | null;
  amazonReviewUrl: string | null;
  categoryTag: string | null;
  isBestseller: boolean;
  showWorkshopCalendar: boolean;
  pickupAvailable: boolean;
  leadText: string | null;
  dimensionsText: string | null;
  weightText: string | null;
  materialText: string | null;
  featureBullets: string[];
  attributes: ProductAttribute[];
  currency: string;
  images: { id: string; url: string; alt: string; sortOrder: number; isCover: boolean }[];
  variants: {
    id: string;
    sku: string;
    title: string | null;
    isDefault: boolean;
    isActive: boolean;
    priceGrossCents: number;
    availableQuantity: number;
    stockQuantity: number;
  }[];
  collectionTitles: string[];
  collectionIds: string[];
  defaultSku: string | null;
};

const initialState: ProductFormState = null;

const saveBtnClass =
  "shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-(--primary-hover) disabled:opacity-50";

export function EditProductForm({
  product,
  manufacturers,
  shopAssignment,
  aiReady = false,
  isNewDraft = false,
}: {
  product: Product;
  manufacturers: Manufacturer[];
  shopAssignment: AdminShopAssignmentOption;
  aiReady?: boolean;
  /** Aus „Neues Produkt“ — Button-Label angepasst. */
  isNewDraft?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateProduct, initialState);
  const [savedFlash, setSavedFlash] = useState(false);
  const [descriptionHtml, setDescriptionHtml] = useState(() =>
    plainDescriptionToHtml(product.description),
  );
  const [descriptionKey, setDescriptionKey] = useState(0);
  const [leadText, setLeadText] = useState(product.leadText ?? "");
  const [leadTextKey, setLeadTextKey] = useState(0);
  const [featureBullets, setFeatureBullets] = useState<string[]>(product.featureBullets);
  const [featureBulletsKey, setFeatureBulletsKey] = useState(0);

  useEffect(() => {
    if (!state?.ok) return;
    const show = window.setTimeout(() => {
      setSavedFlash(true);
      if (isNewDraft) {
        // Entwurfs-Query entfernen, sobald einmal gespeichert wurde.
        router.replace(`/admin/products/${product.id}/edit`);
      }
      router.refresh();
    }, 0);
    const hide = window.setTimeout(() => setSavedFlash(false), 4000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [state?.ok, router, isNewDraft, product.id]);

  const defaultSku =
    product.defaultSku ??
    product.variants.find((v) => v.isDefault)?.sku ??
    product.variants[0]?.sku ??
    null;
  const shopDefaults = resolveSelectedShopAssignment({
    membershipCollectionIds: product.collectionIds,
    options: shopAssignment,
  });

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <ProductAiTextAssistant
        aiReady={aiReady}
        categoryNames={product.collectionTitles}
        defaultSku={defaultSku}
        onApply={(target, value) => {
          if (target === "descriptionHtml") {
            setDescriptionHtml(value);
            setDescriptionKey((k) => k + 1);
            return;
          }
          if (target === "leadText") {
            setLeadText(value.slice(0, 500));
            setLeadTextKey((k) => k + 1);
            return;
          }
          setFeatureBullets(
            value
              .split(/\r?\n/)
              .map((l) => l.trim())
              .filter(Boolean),
          );
          setFeatureBulletsKey((k) => k + 1);
        }}
      />

      <form
        id="admin-product-edit-form"
        action={formAction}
        className="flex flex-col gap-8"
      >
        <input type="hidden" name="id" value={product.id} />

        <ProductGeneralFields
          state={state}
          manufacturers={manufacturers}
          defaults={{
            title: product.title,
            slug: product.slug,
            subtitle: product.subtitle ?? "",
            descriptionHtml,
            descriptionKey,
            manufacturerId: product.manufacturerId,
            productNumber: product.productNumber,
            sku: defaultSku,
            amazonRatingAverage:
              product.amazonRatingAverage != null
                ? String(product.amazonRatingAverage).replace(".", ",")
                : "",
            amazonRatingCount:
              product.amazonRatingCount != null ? String(product.amazonRatingCount) : "",
            amazonReviewUrl: product.amazonReviewUrl ?? "",
          }}
        />

        <ProductStorefrontDetailFields
          state={state}
          defaults={{
            categoryTag: product.categoryTag ?? "",
            isBestseller: product.isBestseller,
            showWorkshopCalendar: product.showWorkshopCalendar,
            pickupAvailable: product.pickupAvailable,
            leadText,
            leadTextKey,
            dimensionsText: product.dimensionsText ?? "",
            weightText: product.weightText ?? "",
            materialText: product.materialText ?? "",
          }}
        />

        <ProductAttributesFields
          state={state}
          defaults={product.attributes ?? []}
        />

        <ProductUspFields
          key={featureBulletsKey}
          state={state}
          defaults={featureBullets}
        />

        <ProductShopAssignmentFields
          state={state}
          options={shopAssignment}
          defaults={shopDefaults}
        />

        <ProductPricesSection
          defaultTaxPercent={product.taxRatePercent}
          mainGrossCents={product.priceGrossCents}
          mainNetCents={product.priceNetCents}
          listGrossCents={product.listPriceGrossCents}
          listNetCents={product.listPriceNetCents}
          low30GrossCents={product.lowestPrice30dGrossCents}
          low30NetCents={product.lowestPrice30dNetCents}
          fieldErrors={state?.fieldErrors}
        />

        <ProductDeliveryFields
          state={state}
          defaults={{
            stockQuantity: product.stockQuantity,
            availableQuantity: product.availableQuantity,
            deliveryTimeKey: product.deliveryTimeKey,
            restockDays: product.restockDays,
            minOrderQty: product.minOrderQty,
            purchaseStep: product.purchaseStep,
            maxOrderQty: product.maxOrderQty,
          }}
        />

        <AdminFormActionDock>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="isActive" className="text-xs font-medium text-[#6b7280]">
                Im Shop sichtbar
              </label>
              <select
                id="isActive"
                name="isActive"
                defaultValue={product.isActive ? "true" : "false"}
                className="max-w-xs rounded-md border border-[#e5e7eb] bg-white px-3 py-2 text-sm"
              >
                <option value="true">Sichtbar im Shop</option>
                <option value="false">Ausgeblendet</option>
              </select>
              {state?.fieldErrors?.isActive ? (
                <p className="text-sm text-red-600">{state.fieldErrors.isActive}</p>
              ) : null}
            </div>
            <button type="submit" disabled={pending} className={saveBtnClass}>
              {pending
                ? "Wird gespeichert…"
                : isNewDraft
                  ? "Produkt speichern"
                  : "Änderungen speichern"}
            </button>
          </div>
          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          {state?.fieldErrors && Object.keys(state.fieldErrors).length > 0 && !state.error ? (
            <p className="text-sm text-red-600" role="alert">
              Speichern fehlgeschlagen — bitte markierte Felder prüfen.
            </p>
          ) : null}
          {savedFlash ? (
            <p className="text-sm font-medium text-primary" role="status">
              Änderungen gespeichert.
            </p>
          ) : null}
        </AdminFormActionDock>
      </form>

      <ProductVariantsSection
        productId={product.id}
        variants={product.variants}
        currency={product.currency}
      />

      <ProductMediaSection productId={product.id} images={product.images} />

      <ProductAiImageAssistant
        productId={product.id}
        productTitle={product.title}
        materialText={product.materialText}
        aiReady={aiReady}
        existingImages={product.images.map((img) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
        }))}
      />
    </div>
  );
}
