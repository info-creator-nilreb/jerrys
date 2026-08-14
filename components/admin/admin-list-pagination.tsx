import Link from "next/link";
import {
  ADMIN_LIST_PAGE_SIZES,
  adminListPageCount,
  adminListRangeLabel,
  buildAdminListHref,
  type AdminListPageSize,
} from "@/lib/admin/list-pagination";

type AdminListPaginationProps = {
  basePath: string;
  page: number;
  pageSize: AdminListPageSize;
  total: number;
};

function pageNumbers(current: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages = new Set<number>([1, totalPages, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
}

export function AdminListPagination({
  basePath,
  page,
  pageSize,
  total,
}: AdminListPaginationProps) {
  const totalPages = adminListPageCount(total, pageSize);
  const current = { page, pageSize };
  const numbers = pageNumbers(page, totalPages);

  return (
    <nav
      className="mt-6 flex flex-col gap-4 border-t border-[#e8eaed] pt-4 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Seitennavigation"
    >
      <p className="text-sm text-[#6b7280]">{adminListRangeLabel(page, pageSize, total)}</p>

      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm text-[#374151]">
          <span className="text-[#6b7280]">Pro Seite</span>
          {ADMIN_LIST_PAGE_SIZES.map((size) => {
            const active = size === pageSize;
            return active ? (
              <span
                key={size}
                className="rounded-md bg-primary/10 px-2.5 py-1 font-semibold text-primary"
                aria-current="true"
              >
                {size}
              </span>
            ) : (
              <Link
                key={size}
                href={buildAdminListHref(basePath, { page: 1, size }, current)}
                className="rounded-md px-2.5 py-1 font-medium text-[#374151] hover:bg-[#f3f4f6]"
              >
                {size}
              </Link>
            );
          })}
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center gap-1">
            {page > 1 ? (
              <Link
                href={buildAdminListHref(basePath, { page: page - 1 }, current)}
                className="rounded-md border border-[#e3e4e8] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Zurück
              </Link>
            ) : (
              <span className="rounded-md border border-[#e8eaed] px-3 py-1.5 text-sm text-[#9ca3af]">
                Zurück
              </span>
            )}

            {numbers.map((n, idx) => {
              const prev = numbers[idx - 1];
              const gap = prev != null && n - prev > 1;
              return (
                <span key={n} className="inline-flex items-center gap-1">
                  {gap ? <span className="px-1 text-[#9ca3af]">…</span> : null}
                  {n === page ? (
                    <span
                      className="min-w-9 rounded-md bg-primary px-2 py-1.5 text-center text-sm font-semibold text-white"
                      aria-current="page"
                    >
                      {n}
                    </span>
                  ) : (
                    <Link
                      href={buildAdminListHref(basePath, { page: n }, current)}
                      className="min-w-9 rounded-md border border-[#e3e4e8] bg-white px-2 py-1.5 text-center text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
                    >
                      {n}
                    </Link>
                  )}
                </span>
              );
            })}

            {page < totalPages ? (
              <Link
                href={buildAdminListHref(basePath, { page: page + 1 }, current)}
                className="rounded-md border border-[#e3e4e8] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] hover:bg-[#f9fafb]"
              >
                Weiter
              </Link>
            ) : (
              <span className="rounded-md border border-[#e8eaed] px-3 py-1.5 text-sm text-[#9ca3af]">
                Weiter
              </span>
            )}
          </div>
        ) : null}
      </div>
    </nav>
  );
}
