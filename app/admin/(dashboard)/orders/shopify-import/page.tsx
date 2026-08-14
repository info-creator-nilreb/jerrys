import { redirect } from "next/navigation";

export default function LegacyOrderShopifyImportRedirect() {
  redirect("/admin/einstellungen/importe/bestellungen");
}
