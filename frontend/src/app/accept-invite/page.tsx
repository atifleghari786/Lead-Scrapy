"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token");
  const [status, setStatus] = useState<"pending" | "success" | "error" | "needs-login">("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    if (!localStorage.getItem("access_token")) {
      setStatus("needs-login");
      return;
    }

    api
      .post(`/api/team/accept-invite?token=${encodeURIComponent(token)}`)
      .then(() => {
        setStatus("success");
        setTimeout(() => router.push("/team"), 1500);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err.response?.data?.detail || "This invite link is invalid or has expired.");
      });
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
      <div className="w-full max-w-sm text-center">
        <Link href="/" className="font-display text-lg">Lead Console</Link>

        {status === "pending" && <p className="mt-6 text-ink-600">Joining team…</p>}
        {status === "success" && <p className="mt-6 text-signal-teal600">You're in — redirecting…</p>}
        {status === "error" && <p className="mt-6 text-signal-red">{message}</p>}
        {status === "needs-login" && (
          <div className="mt-6">
            <p className="text-ink-600">Log in first, then open this invite link again.</p>
            <Link href="/login" className="mt-3 inline-block rounded bg-ink-900 px-4 py-2 text-sm text-paper-50">
              Log in
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
