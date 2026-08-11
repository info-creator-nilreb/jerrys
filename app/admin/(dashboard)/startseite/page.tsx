import { redirect } from "next/navigation";

/** Alt-URL: Marketing jetzt unter Inhalte. */
export default function AdminStartseiteRedirectPage() {
  redirect("/admin/inhalte/marketing");
}
