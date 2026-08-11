import type { FaqBlockData } from "@/lib/content/blocks/faq";

export function FaqBlock({ data }: { data: FaqBlockData; blockId: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 md:py-16">
      {data.title ? (
        <h2 className="text-center text-2xl font-semibold text-(--foreground-heading) md:text-3xl">
          {data.title}
        </h2>
      ) : null}
      <div className={`space-y-3 ${data.title ? "mt-10" : ""}`}>
        {data.items.map((item) => (
          <details
            key={item.question}
            className="group rounded-lg border border-(--surface-muted) bg-white px-4 py-3"
          >
            <summary className="cursor-pointer list-none font-medium text-(--foreground-heading) marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-3">
                {item.question}
                <span
                  className="text-primary transition-transform group-open:rotate-45"
                  aria-hidden
                >
                  +
                </span>
              </span>
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-(--foreground-muted)">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
