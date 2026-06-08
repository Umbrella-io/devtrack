export default function ScannerPlaceholder() {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-[var(--shadow-soft)]">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold">
          🚧 Coming Soon
        </div>

        <div className="mb-6 flex h-48 w-full max-w-md items-center justify-center rounded-xl border-2 border-dashed border-[var(--border)]">
          <span className="text-[var(--muted-foreground)]">
            Scanner Placeholder
          </span>
        </div>

        <h2 className="mb-3 text-xl font-semibold">
          Barcode & QR Verification
        </h2>

        <p className="max-w-2xl text-[var(--muted-foreground)]">
          The medicine verification system is currently under development.
          Soon you will be able to scan medicine packages and verify their
          authenticity directly from this page.
        </p>
      </div>
    </section>
  );
}