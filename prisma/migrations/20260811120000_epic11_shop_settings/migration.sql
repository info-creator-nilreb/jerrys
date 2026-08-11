-- Epic 11 Slice 1: ShopSettings branding singleton (ADR-0006)

CREATE TABLE "shop_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "shop_name" TEXT NOT NULL,
    "short_description" TEXT,
    "primary_color" TEXT NOT NULL,
    "primary_hover_color" TEXT NOT NULL,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "support_email" TEXT,
    "legal_name" TEXT,
    "address_line1" TEXT,
    "address_line2" TEXT,
    "address_zip" TEXT,
    "address_city" TEXT,
    "address_country" TEXT NOT NULL DEFAULT 'DE',
    "vat_id" TEXT,
    "instagram_url" TEXT,
    "facebook_url" TEXT,
    "email_from_name" TEXT,
    "logo_light_url" TEXT,
    "logo_dark_url" TEXT,
    "favicon_url" TEXT,
    "og_image_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_settings_pkey" PRIMARY KEY ("id")
);
