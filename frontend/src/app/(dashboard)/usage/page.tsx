"use client";

import useSWR from "swr";
import { api, UsageSummary } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function UsagePage() {
  const { data } = useSWR<UsageSummary>("/api/usage/summary", fetcher);

  if (!data) return <div className="p-8 text-ink-600">Loading…</div>;

  return (
    <div className="p-8">
      <div className="rounded-lg border border-paper-100 bg-white p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-600">{data.plan.toUpperCase()} plan</span>
          <span className="text-sm text-ink-600">
            {data.credits_used_this_period} / {data.monthly_credits} pages used this period
          </span>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded bg-paper-100">
          <div
            className="h-full bg-ink-900"
            style={{ width: `${Math.min((data.credits_used_this_period / data.monthly_credits) * 100, 100)}%` }}
          />
        </div>
        {data.credits_remaining === 0 && (
          <p className="mt-3 text-sm text-signal-red">
            You've used your monthly credits. New jobs are blocked until your period resets or you upgrade.
          </p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-paper-100 bg-white p-5">
          <div className="text-sm text-ink-600">Total jobs</div>
          <div className="mt-1 font-display text-3xl">{data.total_jobs}</div>
        </div>
        <div className="rounded-lg border border-paper-100 bg-white p-5">
          <div className="text-sm text-ink-600">Successful</div>
          <div className="mt-1 font-display text-3xl text-signal-teal600">{data.successful_jobs}</div>
        </div>
        <div className="rounded-lg border border-paper-100 bg-white p-5">
          <div className="text-sm text-ink-600">Failed</div>
          <div className="mt-1 font-display text-3xl text-signal-red">{data.failed_jobs}</div>
        </div>
      </div>
    </div>
  );
}
