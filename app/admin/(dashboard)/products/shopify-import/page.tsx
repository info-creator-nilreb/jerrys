import { redirect } from "next/navigation";

export default function LegacyProductShopifyImportRedirect() {
  redirect("/admin/einstellungen/importe/produkte");
}
