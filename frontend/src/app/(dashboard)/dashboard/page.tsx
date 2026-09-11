"use client";

import useSWR from "swr";
import Link from "next/link";
import { api, UsageSummary } from "@/lib/api";
import clsx from "clsx";
import { ListChecks, CheckCircle2, XCircle, Database, Radar, ArrowUpRight, type LucideIcon } from "lucide-react";
import { IconBadge } from "@/components/IconBadge";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

const STATUS_STYLES: Record<string, string> = {
  queued: "bg-paper-100 text-ink-600",
  running: "bg-signal-amber/15 text-signal-amber",
  completed: "bg-signal-teal/15 text-signal-teal600",
  failed: "bg-signal-red/15 text-signal-red",
  cancelled: "bg-paper-100 text-ink-600",
  paused: "bg-paper-100 text-ink-600",
};

export default function DashboardHome() {
  const { data, isLoading } = useSWR<UsageSummary>("/api/usage/summary", fetcher, {
    refreshInterval: 5000,
  });

  return (
    <div className="p-8">
      <div className="flex items-center justify-end">
        <Link
          href="/scrape"
          className="flex items-center gap-1.5 rounded bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-800"
        >
          <Radar size={15} strokeWidth={1.75} />
          New scraping job
        </Link>
      </div>

      {isLoading || !data ? (
        <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-paper-100 bg-paper-100/50" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard icon={ListChecks} label="Total jobs" value={data.total_jobs} />
            <StatCard icon={CheckCircle2} label="Successful" value={data.successful_jobs} accent="teal" />
            <StatCard icon={XCircle} label="Failed" value={data.failed_jobs} accent="red" />
            <StatCard icon={Database} label="Total records" value={data.total_records} />
          </div>

          <div className="mt-6 rounded-lg border border-paper-100 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-600">
                <span className="font-medium text-ink-900">{data.plan.toUpperCase()}</span> plan —{" "}
                {data.credits_remaining} / {data.monthly_credits} pages remaining this period
              </span>
              {data.credits_remaining < data.monthly_credits * 0.15 && (
                <Link href="/billing" className="flex items-center gap-1 font-medium text-signal-amber hover:underline">
                  Upgrade plan <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-paper-100">
              <div
                className="h-full rounded-full bg-ink-900 transition-all"
                style={{ width: `${Math.min((data.credits_used_this_period / data.monthly_credits) * 100, 100)}%` }}
              />
            </div>
          </div>

          <div className="mt-8">
            <h2 className="font-display text-lg">Recent jobs</h2>
            <div className="mt-3 divide-y divide-paper-100 rounded-lg border border-paper-100 bg-white shadow-soft">
              {data.recent_jobs.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-14 text-center">
                  <IconBadge icon={Radar} tone="neutral" size="xl" />
                  <div>
                    <p className="text-ink-900">No jobs yet</p>
                    <p className="mt-0.5 text-sm text-ink-600">Start your first scrape to see it here.</p>
                  </div>
                  <Link href="/scrape" className="mt-1 text-sm font-medium text-signal-amber hover:underline">
                    New scraping job
                  </Link>
                </div>
              )}
              {data.recent_jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-paper-50"
                >
                  <span className="text-sm">{job.name}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-ink-600">{job.records_found} records</span>
                    <span className={clsx("rounded px-2 py-0.5 text-xs font-medium", STATUS_STYLES[job.status])}>
                      {job.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: "teal" | "red";
}) {
  return (
    <div className="rounded-lg border border-paper-100 bg-white p-5 shadow-soft transition-shadow hover:shadow-lift">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-600">{label}</span>
        <IconBadge icon={Icon} tone={accent === "teal" ? "teal" : accent === "red" ? "red" : "neutral"} size="sm" />
      </div>
      <div
        className={clsx(
          "mt-3 font-display text-3xl",
          accent === "teal" && "text-signal-teal600",
          accent === "red" && "text-signal-red"
        )}
      >
        {value}
      </div>
    </div>
  );
}
