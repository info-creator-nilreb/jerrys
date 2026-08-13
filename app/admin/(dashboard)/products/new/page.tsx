import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth/admin-session";
import { createProductDraft } from "@/lib/catalog/create-product-draft";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Neues Produkt",
};

/**
 * Neues Produkt = sofort Entwurf anlegen und in die volle Bearbeiten-UI wechseln
 * (Medien-Upload, KI-Text/Bild, Varianten — gleiche Möglichkeiten wie beim Bearbeiten).
 */
export default async function AdminNewProductPage() {
  const session = await getAdminSession();
  if (!session?.user) {
    redirect("/admin/login");
  }

  const draft = await createProductDraft();
  redirect(`/admin/products/${draft.id}/edit?neu=1`);
}
