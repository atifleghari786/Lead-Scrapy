"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export default function SettingsPage() {
  const { data: user } = useSWR("/api/auth/me", fetcher);

  return (
    <div className="p-8">
      <div className="max-w-md space-y-4 rounded-lg border border-paper-100 bg-white p-5">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-600">Full name</span>
          <input defaultValue={user?.full_name || ""} className="w-full rounded border border-paper-100 px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink-600">Email</span>
          <input defaultValue={user?.email || ""} disabled className="w-full rounded border border-paper-100 bg-paper-50 px-3 py-2 text-sm text-ink-600" />
        </label>
        <button className="rounded bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-800">
          Save changes
        </button>
      </div>
    </div>
  );
}
