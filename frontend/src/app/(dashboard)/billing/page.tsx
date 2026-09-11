"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { api, UsageSummary } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data);
const PLANS = ["free", "starter", "pro", "business"] as const;

export default function BillingPage() {
  const params = useSearchParams();
  const { data, mutate } = useSWR<UsageSummary>("/api/usage/summary", fetcher);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function switchPlan(plan: string) {
    setError(null);
    setLoadingPlan(plan);
    try {
      const { data } = await api.post(`/api/billing/checkout-session?plan=${plan}`);
      window.location.href = data.checkout_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Billing isn't set up yet — add your Stripe keys in the backend .env.");
      setLoadingPlan(null);
    }
  }

  async function openPortal() {
    setError(null);
    try {
      const { data } = await api.post("/api/billing/portal-session");
      window.location.href = data.portal_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || "Billing isn't set up yet — add your Stripe keys in the backend .env.");
    }
  }

  return (
    <div className="p-8">
      <p className="text-sm text-ink-600">Current plan: {data?.plan?.toUpperCase() || "—"}</p>

      {params.get("success") === "1" && (
        <p className="mt-4 rounded bg-signal-teal/10 px-3 py-2 text-sm text-signal-teal600">
          Payment received — your plan will update within a few seconds once Stripe confirms it.
        </p>
      )}
      {error && <p className="mt-4 rounded bg-signal-red/10 px-3 py-2 text-sm text-signal-red">{error}</p>}

      <div className="mt-6 grid grid-cols-4 gap-4">
        {PLANS.map((plan) => (
          <div
            key={plan}
            className={`rounded-lg border p-5 ${data?.plan === plan ? "border-ink-900" : "border-paper-100"}`}
          >
            <div className="font-medium capitalize">{plan}</div>
            {data?.plan === plan ? (
              <div className="mt-3 text-sm text-ink-600">Current plan</div>
            ) : plan === "free" ? (
              <div className="mt-3 text-sm text-ink-600">Downgrade via billing portal</div>
            ) : (
              <button
                onClick={() => switchPlan(plan)}
                disabled={loadingPlan === plan}
                className="mt-3 text-sm text-signal-amber hover:underline disabled:opacity-50"
              >
                {loadingPlan === plan ? "Redirecting…" : `Switch to ${plan}`}
              </button>
            )}
          </div>
        ))}
      </div>

      {data && data.plan !== "free" && (
        <button onClick={openPortal} className="mt-6 text-sm text-ink-600 underline hover:text-ink-900">
          Manage payment method / cancel subscription
        </button>
      )}
    </div>
  );
}
