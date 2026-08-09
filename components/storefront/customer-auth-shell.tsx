import Link from "next/link";
import type { ReactNode } from "react";

export function CustomerAuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 md:py-14">
      <div className="mb-8">
        <p className="text-sm font-medium text-primary">
          <Link href="/" className="hover:underline">
            jerry&apos;s
          </Link>
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-(--foreground-heading) md:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-(--foreground-muted)">{description}</p>
        ) : null}
      </div>
      {children}
      {footer ? <div className="mt-8 text-sm text-(--foreground-muted)">{footer}</div> : null}
    </div>
  );
}

export const customerAuthInputClass =
  "box-border min-h-[44px] w-full rounded-md border border-[#d2d5d9] bg-white px-3 py-[10px] text-sm leading-normal text-[#1f2937] outline-none ring-primary placeholder:text-[#9ca3af] focus:border-primary focus:ring-1";

export const customerAuthPrimaryButtonClass =
  "inline-flex min-h-[44px] w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-(--primary-hover) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60";

export const customerAuthSecondaryLinkClass =
  "font-medium text-primary underline-offset-2 hover:underline";
