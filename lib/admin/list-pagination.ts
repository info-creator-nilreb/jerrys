export const ADMIN_LIST_PAGE_SIZES = [25, 50, 100] as const;

export type AdminListPageSize = (typeof ADMIN_LIST_PAGE_SIZES)[number];

export const ADMIN_LIST_DEFAULT_PAGE_SIZE: AdminListPageSize = 25;

export type AdminListPagination = {
  page: number;
  pageSize: AdminListPageSize;
  skip: number;
  take: number;
};

export function parseAdminListPagination(searchParams: {
  page?: string;
  size?: string;
}): AdminListPagination {
  const rawSize = Number(searchParams.size);
  const pageSize: AdminListPageSize = ADMIN_LIST_PAGE_SIZES.includes(
    rawSize as AdminListPageSize,
  )
    ? (rawSize as AdminListPageSize)
    : ADMIN_LIST_DEFAULT_PAGE_SIZE;

  const rawPage = Number(searchParams.page);
  const page =
    Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

export function buildAdminListHref(
  basePath: string,
  patch: { page?: number; size?: AdminListPageSize },
  current: { page: number; pageSize: AdminListPageSize },
): string {
  const page = patch.page ?? current.page;
  const pageSize = patch.size ?? current.pageSize;
  const sp = new URLSearchParams();
  if (page > 1) sp.set("page", String(page));
  if (pageSize !== ADMIN_LIST_DEFAULT_PAGE_SIZE) sp.set("size", String(pageSize));
  const query = sp.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function adminListPageCount(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}

export function adminListRangeLabel(page: number, pageSize: number, total: number): string {
  if (total === 0) return "0 Einträge";
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return `${from}–${to} von ${total.toLocaleString("de-DE")}`;
}

/** Korrigiert Seite, wenn sie nach Größenwechsel außerhalb des Bereichs liegt. */
export function clampAdminListPage(
  pagination: AdminListPagination,
  total: number,
): AdminListPagination {
  const maxPage = adminListPageCount(total, pagination.pageSize);
  if (pagination.page <= maxPage) return pagination;
  const page = maxPage;
  return {
    ...pagination,
    page,
    skip: (page - 1) * pagination.pageSize,
  };
}
