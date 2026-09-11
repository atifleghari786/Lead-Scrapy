"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Radar } from "lucide-react";
import { api } from "@/lib/api";
import { IconBadge } from "@/components/IconBadge";

type FieldDraft = { field_name: string; selector_type: "css" | "regex"; selector: string; attribute: string };

export default function ScrapePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [maxPages, setMaxPages] = useState(50);
  const [crawlDepth, setCrawlDepth] = useState(2);
  const [sameDomainOnly, setSameDomainOnly] = useState(true);
  const [respectRobots, setRespectRobots] = useState(true);
  const [requestDelay, setRequestDelay] = useState(800);
  const [fields, setFields] = useState<FieldDraft[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function addField() {
    setFields([...fields, { field_name: "", selector_type: "css", selector: "", attribute: "" }]);
  }

  function updateField(index: number, patch: Partial<FieldDraft>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/jobs", {
        name,
        target_url: targetUrl,
        max_pages: maxPages,
        crawl_depth: crawlDepth,
        same_domain_only: sameDomainOnly,
        respect_robots_txt: respectRobots,
        request_delay_ms: requestDelay,
        extraction_fields: fields
          .filter((f) => f.field_name && f.selector)
          .map((f) => ({ ...f, attribute: f.attribute || null })),
      });
      router.push(`/jobs/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not start the job. Check the target URL and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-8">
      <div className="flex items-center gap-4 rounded-lg border border-paper-100 bg-white p-6 shadow-soft">
        <IconBadge icon={Radar} tone="amber" size="lg" />
        <div>
          <h2 className="font-display text-xl">Site crawler</h2>
          <p className="text-sm text-ink-600">Crawl a site and extract structured data with a background job.</p>
        </div>
      </div>

      <p className="text-sm text-ink-600">
        Only publicly accessible pages are crawled. Robots.txt is respected by default.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="rounded-lg border border-paper-100 bg-white p-5 shadow-soft">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-600">Job name</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chamber of commerce directory"
              className="w-full rounded border border-paper-100 px-3 py-2"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm text-ink-600">Target URL</span>
            <input
              required
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder="https://example.com/directory"
              className="w-full rounded border border-paper-100 px-3 py-2"
            />
          </label>
        </div>

        <div className="rounded-lg border border-paper-100 bg-white p-5 shadow-soft">
          <h2 className="font-medium">Crawler controls</h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-600">Max pages</span>
              <input
                type="number"
                min={1}
                max={2000}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
                className="w-full rounded border border-paper-100 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-600">Crawl depth</span>
              <input
                type="number"
                min={0}
                max={5}
                value={crawlDepth}
                onChange={(e) => setCrawlDepth(Number(e.target.value))}
                className="w-full rounded border border-paper-100 px-3 py-2"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-600">Request delay (ms)</span>
              <input
                type="number"
                min={200}
                value={requestDelay}
                onChange={(e) => setRequestDelay(Number(e.target.value))}
                className="w-full rounded border border-paper-100 px-3 py-2"
              />
            </label>
          </div>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={sameDomainOnly} onChange={(e) => setSameDomainOnly(e.target.checked)} />
            Restrict to the same domain
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={respectRobots} onChange={(e) => setRespectRobots(e.target.checked)} />
            Respect robots.txt
          </label>
        </div>

        <div className="rounded-lg border border-paper-100 bg-white p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Custom fields</h2>
            <button type="button" onClick={addField} className="text-sm text-signal-amber hover:underline">
              + Add field
            </button>
          </div>
          <p className="mt-1 text-sm text-ink-600">
            Email, phone, social links, and page title are extracted automatically. Add a field here for anything else.
          </p>
          <div className="mt-4 space-y-3">
            {fields.map((field, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2">
                <input
                  placeholder="field name"
                  value={field.field_name}
                  onChange={(e) => updateField(i, { field_name: e.target.value })}
                  className="rounded border border-paper-100 px-2 py-1.5 text-sm"
                />
                <select
                  value={field.selector_type}
                  onChange={(e) => updateField(i, { selector_type: e.target.value as "css" | "regex" })}
                  className="rounded border border-paper-100 px-2 py-1.5 text-sm"
                >
                  <option value="css">CSS selector</option>
                  <option value="regex">Regex</option>
                </select>
                <input
                  placeholder="e.g. .price, or a regex pattern"
                  value={field.selector}
                  onChange={(e) => updateField(i, { selector: e.target.value })}
                  className="rounded border border-paper-100 px-2 py-1.5 text-sm"
                />
                <button type="button" onClick={() => removeField(i)} className="text-sm text-signal-red">
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-ink-900 px-6 py-2.5 font-medium text-paper-50 hover:bg-ink-800 disabled:opacity-50"
        >
          {submitting ? "Starting…" : "Start scraping"}
        </button>
      </form>
    </div>
  );
}
