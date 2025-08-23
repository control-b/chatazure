"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function SignInPage() {
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignIn = async (provider: string) => {
    try {
      setLoading(provider);
      await signIn(provider, { callbackUrl: "/" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-400 mb-2">ChatDO</h1>
          <p className="text-slate-300 text-sm">
            Trucking Communication Platform
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleSignIn("azure-ad-b2c")}
            className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 disabled:opacity-60 font-medium text-sm flex items-center justify-center gap-2"
            disabled={loading !== null}
          >
            {loading === "azure-ad-b2c"
              ? "Redirecting…"
              : "Continue with Azure AD B2C"}
          </button>

          <button
            onClick={() => handleSignIn("google")}
            className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700/70 hover:bg-slate-600/70 text-white transition-all duration-200 disabled:opacity-60 font-medium text-sm flex items-center justify-center gap-2"
            disabled={loading !== null}
          >
            {loading === "google" ? "Redirecting…" : "Continue with Google"}
          </button>

          <button
            onClick={async () => {
              setLoading("demo");
              await signIn("demo", {
                name: "Dispatcher Doe",
                callbackUrl: "/",
              });
              setLoading(null);
            }}
            className="w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700/70 hover:bg-slate-600/70 text-white transition-all duration-200 disabled:opacity-60 font-medium text-sm flex items-center justify-center gap-2"
            disabled={loading !== null}
          >
            {loading === "demo" ? "Signing in…" : "Try Demo Mode"}
          </button>

          <Link
            href="/app?demo=1"
            className="block w-full px-4 py-3 rounded-lg border border-slate-600 bg-slate-700/70 hover:bg-slate-600/70 text-white transition-all duration-200 font-medium text-sm text-center"
          >
            Open Demo UI
          </Link>
        </div>

        <p className="text-xs text-slate-400 mt-6 text-center">
          Demo mode lets you explore the interface without authentication
        </p>
      </div>
    </div>
  );
}
