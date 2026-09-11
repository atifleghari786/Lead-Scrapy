"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Share2 } from "lucide-react";
import { api } from "@/lib/api";
import { IconBadge } from "@/components/IconBadge";

const INFO_POINTS = [
  "Scans every link on the page for known social platforms",
  "Skips share and intent URLs",
  "Costs 1 credit per URL",
];

export default function SocialExtractorPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/jobs/extract-social", { url });
      router.push(`/jobs/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not extract links. Check the URL and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center gap-4 rounded-lg border border-paper-100 bg-white p-6 shadow-soft">
        <IconBadge icon={Share2} tone="amber" size="lg" />
        <div>
          <h2 className="font-display text-xl">Social links extractor</h2>
          <p className="text-sm text-ink-600">Pulls LinkedIn, Twitter/X, Instagram, and other social profile links off a page.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-paper-100 bg-white p-6 shadow-soft">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-600">Page URL</span>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/about"
              className="w-full rounded-lg border border-paper-100 px-3 py-2.5"
            />
          </label>
        </div>

        {error && <p className="rounded-lg bg-signal-red/10 px-4 py-2.5 text-sm text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-ink-900 px-6 py-2.5 font-medium text-paper-50 hover:bg-ink-800 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Extract links"}
        </button>
      </form>

      <div className="rounded-lg border border-paper-100 bg-ink-900/[0.03] p-4 text-sm text-ink-600">
        <p className="mb-2 font-medium text-ink-900">How it works</p>
        <ul className="space-y-1.5">
          {INFO_POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal-amber" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
