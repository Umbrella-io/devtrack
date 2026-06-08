export default function ScannerInstructions() {
  return (
    <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)]">
      <h2 className="mb-4 text-xl font-semibold">
        How it will work
      </h2>

      <ul className="space-y-3 text-[var(--muted-foreground)]">
        <li>• Open the scanner page.</li>
        <li>• Scan a barcode or QR code from the medicine package.</li>
        <li>• Verify authenticity and product information.</li>
        <li>• Review warnings, expiry dates, and manufacturer details.</li>
      </ul>
    </section>
  );
}