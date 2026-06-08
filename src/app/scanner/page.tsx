import Link from "next/link";
import ScannerPlaceholder from "@/components/scanner/ScannerPlaceholder";
import ScannerInstructions from "@/components/scanner/ScannerInstructions";

export default function ScannerPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            DevTrack
          </Link>

          <h1 className="mt-3 text-3xl font-bold md:text-4xl">
            Medicine Verification Scanner
          </h1>

          <p className="mt-2 text-[var(--muted-foreground)]">
            Scan medicine barcodes and QR codes to verify authenticity and
            access medicine information.
          </p>
        </div>

        <ScannerPlaceholder />
        <ScannerInstructions />
      </div>
    </main>
  );
}