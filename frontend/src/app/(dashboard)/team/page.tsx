"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

type Member = { id: string; email: string; full_name: string | null; role: string };
type Invite = { id: string; email: string; role: string; expires_at: string };

export default function TeamPage() {
  const { data: user } = useSWR("/api/auth/me", fetcher);
  const { data: members, mutate: mutateMembers } = useSWR<Member[]>("/api/team/members", fetcher);
  const { data: invites, mutate: mutateInvites } = useSWR<Invite[]>("/api/team/invites", fetcher, {
    // Only owners/admins can list invites — a 403 here just means "not shown", not an error to surface
    onError: () => {},
  });

  const [email, setEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/api/team/create?name=${encodeURIComponent(teamName)}`);
      mutateMembers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not create team");
    }
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post(`/api/team/invite?email=${encodeURIComponent(email)}`);
      setEmail("");
      mutateInvites();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Could not send invite");
    }
  }

  async function removeMember(id: string) {
    await api.delete(`/api/team/members/${id}`);
    mutateMembers();
  }

  if (!user || members === undefined) {
    return <div className="p-8 text-ink-600">Loading…</div>;
  }

  const hasTeam = members.length > 0;

  return (
    <div className="p-8">
      <p className="text-sm text-ink-600">
        Available on Pro and Business plans. Invite teammates to share jobs, leads, and templates.
      </p>

      {error && <p className="mt-4 rounded bg-signal-red/10 px-3 py-2 text-sm text-signal-red">{error}</p>}

      {!hasTeam && (
        <form onSubmit={createTeam} className="mt-6 max-w-md rounded-lg border border-paper-100 bg-white p-5">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-600">Create a team</span>
            <div className="flex gap-2">
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Team name"
                className="flex-1 rounded border border-paper-100 px-3 py-2 text-sm"
              />
              <button className="rounded bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-800">
                Create
              </button>
            </div>
          </label>
        </form>
      )}

      {hasTeam && (
        <>
          <form onSubmit={invite} className="mt-6 max-w-md rounded-lg border border-paper-100 bg-white p-5">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-600">Invite by email</span>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teammate@company.com"
                  className="flex-1 rounded border border-paper-100 px-3 py-2 text-sm"
                />
                <button className="rounded bg-ink-900 px-4 py-2 text-sm font-medium text-paper-50 hover:bg-ink-800">
                  Invite
                </button>
              </div>
            </label>
          </form>

          <div className="mt-6">
            <h2 className="font-medium">Members</h2>
            <div className="mt-2 divide-y divide-paper-100 rounded-lg border border-paper-100 bg-white">
              {members?.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span>{m.full_name || m.email} <span className="text-ink-600">— {m.role}</span></span>
                  {m.role !== "owner" && (
                    <button onClick={() => removeMember(m.id)} className="text-signal-red hover:underline">Remove</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {invites && invites.length > 0 && (
            <div className="mt-6">
              <h2 className="font-medium">Pending invites</h2>
              <div className="mt-2 divide-y divide-paper-100 rounded-lg border border-paper-100 bg-white">
                {invites.map((i) => (
                  <div key={i.id} className="flex items-center justify-between px-4 py-2.5 text-sm text-ink-600">
                    <span>{i.email}</span>
                    <span>expires {new Date(i.expires_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
