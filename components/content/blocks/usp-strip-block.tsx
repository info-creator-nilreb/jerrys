import { UspIcon } from "@/components/storefront/usp-icons";
import type { UspStripBlockData } from "@/lib/content/blocks/usp-strip";

export function UspStripBlock({ data }: { data: UspStripBlockData; blockId: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 md:py-16">
      <div className="grid gap-8 md:grid-cols-3">
        {data.items.map((u) => (
          <article
            key={u.title}
            className="rounded-lg border border-(--surface-muted) bg-white p-6 text-center shadow-sm"
          >
            <div className="flex flex-col items-center">
              <UspIcon variant={u.icon} />
              <h3 className="mt-4 text-lg font-semibold text-(--foreground-heading)">
                {u.title}
              </h3>
              <p className="mt-2 text-sm text-(--foreground-muted)">{u.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
