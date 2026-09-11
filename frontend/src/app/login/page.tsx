"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justSignedUp = params.get("verify") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg">Lead Console</Link>
        <h1 className="mt-8 font-display text-2xl">Log in</h1>

        {justSignedUp && (
          <p className="mt-4 rounded bg-signal-teal/10 px-3 py-2 text-sm text-signal-teal600">
            Check your email to verify your account, then log in.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-600">Email</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-600">Password</span>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
          </label>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-ink-900 py-2.5 font-medium text-paper-50 hover:bg-ink-800 disabled:opacity-50"
          >
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-4 text-sm text-ink-600">
          <Link href="/forgot-password" className="underline">Forgot password?</Link>
        </p>
        <p className="mt-2 text-sm text-ink-600">
          No account? <Link href="/signup" className="underline">Sign up</Link>
        </p>
      </div>

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #ECEEF1;
          border-radius: 5px;
          padding: 0.6rem 0.75rem;
          background: white;
        }
        .input:focus {
          outline: 2px solid #E8A33D;
          outline-offset: 1px;
        }
      `}</style>
    </main>
  );
}
