"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { api, Lead } from "@/lib/api";
import { Search, Users, FileDown, Trash2, ExternalLink, ShieldCheck } from "lucide-react";

const VERDICT_STYLES: Record<string, string> = {
  valid: "bg-signal-teal/15 text-signal-teal600",
  risky: "bg-signal-amber/15 text-signal-amber",
  invalid: "bg-signal-red/15 text-signal-red",
};

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function LeadsPage() {
  const params = useSearchParams();
  const jobId = params.get("job_id");

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [verifying, setVerifying] = useState(false);

  const query = new URLSearchParams();
  if (jobId) query.set("job_id", jobId);
  if (search) query.set("search", search);

  const { data: leads, isLoading, mutate } = useSWR<Lead[]>(`/api/leads?${query.toString()}`, fetcher);

  function toggleSelect(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  function toggleSelectAll() {
    if (!leads) return;
    setSelected(selected.size === leads.length ? new Set() : new Set(leads.map((l) => l.id)));
  }

  async function bulkDelete() {
    if (selected.size === 0) return;
    await api.post("/api/leads/bulk-delete", Array.from(selected));
    setSelected(new Set());
    mutate();
  }

  async function verifyEmails() {
    if (selected.size === 0) return;
    setVerifying(true);
    try {
      await api.post("/api/leads/verify-emails", Array.from(selected));
      mutate();
    } finally {
      setVerifying(false);
    }
  }

  function exportUrl(format: "csv" | "xlsx" | "json") {
    const q = new URLSearchParams();
    if (jobId) q.set("job_id", jobId);
    return `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/export/${format}?${q.toString()}`;
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-80">
          <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-paper-400" />
          <input
            placeholder="Search company, email, website…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-paper-100 py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 text-sm">
          {selected.size > 0 && (
            <>
              <button
                onClick={verifyEmails}
                disabled={verifying}
                className="flex items-center gap-1.5 text-ink-900 hover:underline disabled:opacity-50"
              >
                <ShieldCheck size={14} strokeWidth={1.75} />
                {verifying ? "Verifying…" : `Verify emails (${selected.size})`}
              </button>
              <button onClick={bulkDelete} className="flex items-center gap-1.5 text-signal-red hover:underline">
                <Trash2 size={14} strokeWidth={1.75} />
                Delete {selected.size}
              </button>
            </>
          )}
          <a href={exportUrl("csv")} className="flex items-center gap-1.5 rounded border border-paper-100 px-3 py-1.5 hover:border-ink-600">
            <FileDown size={14} strokeWidth={1.75} /> CSV
          </a>
          <a href={exportUrl("xlsx")} className="flex items-center gap-1.5 rounded border border-paper-100 px-3 py-1.5 hover:border-ink-600">
            <FileDown size={14} strokeWidth={1.75} /> XLSX
          </a>
          <a href={exportUrl("json")} className="flex items-center gap-1.5 rounded border border-paper-100 px-3 py-1.5 hover:border-ink-600">
            <FileDown size={14} strokeWidth={1.75} /> JSON
          </a>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-paper-100 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-paper-100 bg-paper-50 text-left text-ink-600">
            <tr>
              <th className="w-10 px-4 py-2.5">
                <input type="checkbox" checked={!!leads && selected.size === leads.length && leads.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="px-4 py-2.5 font-medium">Website</th>
              <th className="px-4 py-2.5 font-medium">Email</th>
              <th className="px-4 py-2.5 font-medium">Phone</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Scraped</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-100">
            {isLoading && <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-600">Loading…</td></tr>}
            {leads?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Users size={28} strokeWidth={1.25} className="text-paper-400" />
                    <div>
                      <p className="text-ink-900">{search ? "No leads match your search" : "No leads yet"}</p>
                      <p className="mt-0.5 text-sm text-ink-600">
                        {search ? "Try a different search term." : "Run a scraping job to collect leads."}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            {leads?.map((lead) => (
              <tr key={lead.id} className="hover:bg-paper-50">
                <td className="px-4 py-2.5">
                  <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleSelect(lead.id)} />
                </td>
                <td className="max-w-[240px] truncate px-4 py-2.5">
                  <a href={lead.website_url || "#"} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:underline">
                    {lead.website_url || "—"}
                    {lead.website_url && <ExternalLink size={11} strokeWidth={1.75} className="shrink-0 text-paper-400" />}
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  {lead.email ? (
                    <span className="flex items-center gap-1.5">
                      {lead.email}
                      {lead.custom_fields?.email_verification && (
                        <span
                          className={clsx(
                            "rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            VERDICT_STYLES[lead.custom_fields.email_verification.verdict]
                          )}
                        >
                          {lead.custom_fields.email_verification.verdict}
                        </span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-2.5">{lead.phone || "—"}</td>
                <td className="px-4 py-2.5 text-ink-600">{lead.status}</td>
                <td className="px-4 py-2.5 text-ink-600">{new Date(lead.scraped_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
