"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/signup", { email, password, full_name: fullName || null });
      router.push("/login?verify=1");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper-50 px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-lg">Lead Console</Link>
        <h1 className="mt-8 font-display text-2xl">Create your account</h1>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Full name (optional)">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </Field>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-ink-900 py-2.5 font-medium text-paper-50 hover:bg-ink-800 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-ink-600">
          Already have an account? <Link href="/login" className="underline">Log in</Link>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-ink-600">{label}</span>
      {children}
    </label>
  );
}
