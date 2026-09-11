"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function EmailFinderPage() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/jobs/find-emails", { domain });
      router.push(`/jobs/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not find emails. Check the domain and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <p className="text-sm text-ink-600">
        Checks the pages where contact details usually live — contact, about, team — instead of crawling the whole site. Costs 1 credit.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div className="rounded-lg border border-paper-100 bg-white p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-600">Domain</span>
            <input
              required
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com"
              className="w-full rounded border border-paper-100 px-3 py-2"
            />
          </label>
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded bg-ink-900 px-6 py-2.5 font-medium text-paper-50 hover:bg-ink-800 disabled:opacity-50"
        >
          {submitting ? "Searching…" : "Find emails"}
        </button>
      </form>
    </div>
  );
}
