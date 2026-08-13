import { redirect } from "next/navigation";
import { isTermineFeatureEnabled } from "@/lib/shop/termine-feature";

/**
 * Admin-Termine nur erreichbar, wenn das Shop-Feature aktiv ist.
 */
export default async function AdminTermineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isTermineFeatureEnabled())) {
    redirect("/admin");
  }
  return children;
}
