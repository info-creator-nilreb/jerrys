export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-(--surface-muted) bg-(--surface-soft)">
      <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-(--foreground-muted)">
        <p>Design Katzenmöbel – in Deutschland designed und gefertigt.</p>
        <p className="mt-2">© {new Date().getFullYear()} jerry&apos;s</p>
      </div>
    </footer>
  );
}
