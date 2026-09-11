"use client";

import useSWR from "swr";
import Link from "next/link";
import clsx from "clsx";
import { api, Job } from "@/lib/api";
import { Radar, ListChecks } from "lucide-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-paper-100 text-ink-600",
  running: "bg-signal-amber/15 text-signal-amber",
  completed: "bg-signal-teal/15 text-signal-teal600",
  failed: "bg-signal-red/15 text-signal-red",
  cancelled: "bg-paper-100 text-ink-600",
  paused: "bg-paper-100 text-ink-600",
};

export default function JobsPage() {
  const { data: jobs, isLoading, mutate } = useSWR<Job[]>("/api/jobs", fetcher, { refreshInterval: 4000 });

  async function rerun(id: string) {
    await api.post(`/api/jobs/${id}/rerun`);
    mutate();
  }

  async function cancel(id: string) {
    await api.post(`/api/jobs/${id}/cancel`);
    mutate();
  }

  async function pause(id: string) {
    await api.post(`/api/jobs/${id}/pause`);
    mutate();
  }

  async function resume(id: string) {
    await api.post(`/api/jobs/${id}/resume`);
    mutate();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-end">
        <Link
          href="/scrape"
          className="flex items-center gap-1.5 rounded bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-800"
        >
          <Radar size={15} strokeWidth={1.75} />
          New job
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-paper-100 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-paper-100 bg-paper-50 text-left text-ink-600">
            <tr>
              <th className="px-4 py-2.5 font-medium">Job</th>
              <th className="px-4 py-2.5 font-medium">Target</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Records</th>
              <th className="px-4 py-2.5 font-medium">Created</th>
              <th className="px-4 py-2.5 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-paper-100">
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-ink-600">Loading…</td></tr>
            )}
            {jobs?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <ListChecks size={28} strokeWidth={1.25} className="text-paper-400" />
                    <div>
                      <p className="text-ink-900">No jobs yet</p>
                      <p className="mt-0.5 text-sm text-ink-600">Every job you run will show up here.</p>
                    </div>
                    <Link href="/scrape" className="mt-1 text-sm font-medium text-signal-amber hover:underline">
                      Start a scraping job
                    </Link>
                  </div>
                </td>
              </tr>
            )}
            {jobs?.map((job) => (
              <tr key={job.id} className="hover:bg-paper-50">
                <td className="px-4 py-2.5">
                  <Link href={`/jobs/${job.id}`} className="font-medium hover:underline">{job.name}</Link>
                </td>
                <td className="max-w-[220px] truncate px-4 py-2.5 text-ink-600">{job.target_url}</td>
                <td className="px-4 py-2.5">
                  <span className={clsx("rounded px-2 py-0.5 text-xs font-medium", STATUS_STYLES[job.status])}>
                    {job.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">{job.records_found}</td>
                <td className="px-4 py-2.5 text-ink-600">{new Date(job.created_at).toLocaleString()}</td>
                <td className="space-x-3 px-4 py-2.5 text-right">
                  {job.status === "running" && (
                    <>
                      <button onClick={() => pause(job.id)} className="text-signal-amber hover:underline">Pause</button>
                      <button onClick={() => cancel(job.id)} className="text-signal-red hover:underline">Cancel</button>
                    </>
                  )}
                  {job.status === "queued" && (
                    <button onClick={() => cancel(job.id)} className="text-signal-red hover:underline">Cancel</button>
                  )}
                  {job.status === "paused" && (
                    <>
                      <button onClick={() => resume(job.id)} className="text-signal-teal600 hover:underline">Resume</button>
                      <button onClick={() => cancel(job.id)} className="text-signal-red hover:underline">Cancel</button>
                    </>
                  )}
                  {(job.status === "completed" || job.status === "failed") && (
                    <button onClick={() => rerun(job.id)} className="text-signal-amber hover:underline">Re-run</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
