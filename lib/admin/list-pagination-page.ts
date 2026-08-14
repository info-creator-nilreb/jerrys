import { redirect } from "next/navigation";
import {
  buildAdminListHref,
  clampAdminListPage,
  parseAdminListPagination,
  type AdminListPagination,
} from "@/lib/admin/list-pagination";

/** Parst URL-Parameter, korrigiert ungültige Seiten per Redirect. */
export function resolveAdminListPagination(
  basePath: string,
  searchParams: { page?: string; size?: string },
  total: number,
): AdminListPagination {
  const pagination = parseAdminListPagination(searchParams);
  const clamped = clampAdminListPage(pagination, total);
  if (clamped.page !== pagination.page) {
    redirect(buildAdminListHref(basePath, { page: clamped.page }, clamped));
  }
  return clamped;
}
