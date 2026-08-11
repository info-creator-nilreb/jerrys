import { UspIcon } from "@/components/storefront/usp-icons";
import type { UspStripBlockData } from "@/lib/content/blocks/usp-strip";

export function UspStripBlock({ data }: { data: UspStripBlockData; blockId: string }) {
  return (
    <section
      id="nach-hero"
      className="mx-auto max-w-6xl scroll-mt-[5.5rem] px-4 py-16 md:py-20"
    >
      {data.title ? (
        <h2 className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
          {data.title}
        </h2>
      ) : null}
      {data.intro ? (
        <p className="mx-auto mt-4 max-w-3xl text-center text-base text-(--foreground-muted) md:text-lg">
          {data.intro}
        </p>
      ) : null}
      <div className={`grid gap-8 md:grid-cols-3 ${data.title || data.intro ? "mt-12" : ""}`}>
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
              <p className="mt-2 text-base leading-relaxed text-(--foreground-muted)">{u.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
