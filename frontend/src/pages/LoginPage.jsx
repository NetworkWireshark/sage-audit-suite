import { useState } from "react";
import { LockKeyhole, ScanSearch } from "lucide-react";
import { login } from "../lib/api";

export default function LoginPage({ onAuthenticated }) {
  const [email, setEmail] = useState("admin@sage.local");
  const [password, setPassword] = useState("Admin123!");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const session = await login(email, password);
      onAuthenticated({ email: session.email, role: session.role });
    } catch {
      setError("Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink px-5 py-10">
      <img
        src="/audit-operations.png"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-30"
      />
      <div className="absolute inset-0 bg-ink/80" />
      <section className="relative grid w-full max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-3 rounded border border-line bg-panel/80 px-4 py-3 text-sm text-slate-200">
            <ScanSearch className="h-5 w-5 text-aqua" />
            Sage 100 reconciliation workspace
          </div>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-white md:text-6xl">
              Sage Audit Suite
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Compare Sage exports against invoices, delivery notes, and accounting files with structured issue tracking, exports, and desktop-ready operation.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-lg border border-line bg-panel/95 p-6 shadow-soft">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded border border-line bg-panelSoft">
              <LockKeyhole className="h-5 w-5 text-aqua" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-normal text-slate-400">Secure access</p>
              <h2 className="text-xl font-semibold text-white">Sign in</h2>
            </div>
          </div>
          <div className="space-y-4">
            <label className="block text-sm text-slate-300">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded border border-line bg-ink px-4 py-3 text-white outline-none focus:border-aqua" />
            </label>
            <label className="block text-sm text-slate-300">
              Password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded border border-line bg-ink px-4 py-3 text-white outline-none focus:border-aqua" />
            </label>
          </div>
          {error ? <p className="mt-4 rounded border border-coral/40 bg-coral/10 px-3 py-2 text-sm text-rose-100">{error}</p> : null}
          <button type="submit" disabled={busy} className="mt-6 w-full rounded bg-aqua px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60">
            {busy ? "Signing in..." : "Enter workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}
