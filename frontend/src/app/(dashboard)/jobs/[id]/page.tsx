"use client";

import useSWR from "swr";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { api, Job } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: job, mutate } = useSWR<Job>(`/api/jobs/${id}`, fetcher, {
    refreshInterval: (data) => (data && ["completed", "failed", "cancelled"].includes(data.status) ? 0 : 3000),
  });

  if (!job) return <div className="p-8 text-ink-600">Loading…</div>;

  const isDone = job.status === "completed";
  const pct = job.pages_processed > 0 ? Math.min((job.pages_processed / Math.max(job.pages_processed, 1)) * 100, 100) : 0;

  async function cancel() {
    await api.post(`/api/jobs/${id}/cancel`);
    mutate();
  }

  async function pause() {
    await api.post(`/api/jobs/${id}/pause`);
    mutate();
  }

  async function resume() {
    await api.post(`/api/jobs/${id}/resume`);
    mutate();
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/jobs" className="text-sm text-ink-600 hover:underline">← All jobs</Link>
      <div className="mt-3 flex items-center justify-between">
        <h1 className="font-display text-2xl">{job.name}</h1>
        <span
          className={clsx(
            "rounded px-2.5 py-1 text-xs font-medium",
            job.status === "running" && "bg-signal-amber/15 text-signal-amber",
            job.status === "completed" && "bg-signal-teal/15 text-signal-teal600",
            job.status === "failed" && "bg-signal-red/15 text-signal-red",
            !["running", "completed", "failed"].includes(job.status) && "bg-paper-100 text-ink-600"
          )}
        >
          {job.status}
        </span>
      </div>
      <p className="mt-1 truncate text-sm text-ink-600">{job.target_url}</p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <Stat label="Pages processed" value={job.pages_processed} />
        <Stat label="Records found" value={job.records_found} accent="teal" />
        <Stat label="Errors" value={job.errors_count} accent={job.errors_count > 0 ? "red" : undefined} />
      </div>

      {job.status === "running" && (
        <div className="mt-6 flex gap-4">
          <button onClick={pause} className="text-sm text-signal-amber hover:underline">Pause job</button>
          <button onClick={cancel} className="text-sm text-signal-red hover:underline">Cancel job</button>
        </div>
      )}
      {job.status === "paused" && (
        <div className="mt-6 flex gap-4">
          <button onClick={resume} className="text-sm text-signal-teal600 hover:underline">Resume job</button>
          <button onClick={cancel} className="text-sm text-signal-red hover:underline">Cancel job</button>
        </div>
      )}

      {isDone && (
        <Link
          href={`/leads?job_id=${job.id}`}
          className="mt-6 inline-block rounded bg-ink-900 px-5 py-2.5 text-sm font-medium text-paper-50 hover:bg-ink-800"
        >
          View {job.records_found} leads
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: "teal" | "red" }) {
  return (
    <div className="rounded-lg border border-paper-100 bg-white p-4">
      <div className="text-xs text-ink-600">{label}</div>
      <div
        className={clsx(
          "mt-1 font-display text-2xl",
          accent === "teal" && "text-signal-teal600",
          accent === "red" && "text-signal-red"
        )}
      >
        {value}
      </div>
    </div>
  );
}
