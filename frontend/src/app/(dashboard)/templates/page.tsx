"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import { FileStack, Copy, Trash2 } from "lucide-react";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type Template = { id: string; name: string; description: string | null; created_at: string };

export default function TemplatesPage() {
  const { data: templates, isLoading, mutate } = useSWR<Template[]>("/api/templates", fetcher);

  async function duplicate(id: string) {
    await api.post(`/api/templates/${id}/duplicate`);
    mutate();
  }

  async function remove(id: string) {
    await api.delete(`/api/templates/${id}`);
    mutate();
  }

  return (
    <div className="p-8">
      <p className="text-sm text-ink-600">
        Save a job's crawl settings and custom fields, then reuse them without rebuilding the form.
      </p>

      <div className="mt-6 divide-y divide-paper-100 rounded-lg border border-paper-100 bg-white">
        {isLoading && <p className="p-5 text-ink-600">Loading…</p>}
        {templates?.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileStack size={28} strokeWidth={1.25} className="text-paper-400" />
            <div>
              <p className="text-ink-900">No templates yet</p>
              <p className="mt-0.5 text-sm text-ink-600">Save one from a job's settings once you've run it.</p>
            </div>
          </div>
        )}
        {templates?.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="font-medium">{t.name}</div>
              {t.description && <div className="text-sm text-ink-600">{t.description}</div>}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <button onClick={() => duplicate(t.id)} className="flex items-center gap-1.5 text-signal-amber hover:underline">
                <Copy size={13} strokeWidth={1.75} /> Duplicate
              </button>
              <button onClick={() => remove(t.id)} className="flex items-center gap-1.5 text-signal-red hover:underline">
                <Trash2 size={13} strokeWidth={1.75} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
