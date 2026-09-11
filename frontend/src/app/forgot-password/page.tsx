"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await api.post("/api/auth/forgot-password", { email });
    setSent(true);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg">Lead Console</Link>
        <h1 className="mt-8 font-display text-2xl">Reset your password</h1>

        {sent ? (
          <p className="mt-6 text-ink-600">
            If that email is registered, a reset link is on its way. Check your inbox.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-sm text-ink-600">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-paper-100 px-3 py-2.5"
              />
            </label>
            <button type="submit" className="w-full rounded bg-ink-900 py-2.5 font-medium text-paper-50 hover:bg-ink-800">
              Send reset link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
