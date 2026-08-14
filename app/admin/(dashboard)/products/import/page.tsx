import { redirect } from "next/navigation";

/** Legacy-URL → Einstellungen → Importe */
export default function LegacyProductImportRedirect() {
  redirect("/admin/einstellungen/importe/produkte");
}
