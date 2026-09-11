import Link from "next/link";
import { FileDown } from "lucide-react";

export default function ExportsPage() {
  return (
    <div className="p-8">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-paper-100 bg-white py-16 text-center">
        <FileDown size={28} strokeWidth={1.25} className="text-paper-400" />
        <div>
          <p className="text-ink-900">Exports are generated on demand</p>
          <p className="mt-0.5 text-sm text-ink-600">
            Go to Leads, pick a job or filter, then download CSV, XLSX, or JSON.
          </p>
        </div>
        <Link href="/leads" className="mt-1 text-sm font-medium text-signal-amber hover:underline">
          Go to Leads
        </Link>
      </div>
    </div>
  );
}
