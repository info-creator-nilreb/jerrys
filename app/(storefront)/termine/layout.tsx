import { notFound } from "next/navigation";
import { isTermineFeatureEnabled } from "@/lib/shop/termine-feature";

/**
 * Öffentliche Termin-Routen nur bei aktivem Shop-Feature.
 */
export default async function StorefrontTermineLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isTermineFeatureEnabled())) {
    notFound();
  }
  return children;
}
