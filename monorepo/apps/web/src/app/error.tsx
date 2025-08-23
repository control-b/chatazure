"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App error:", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-slate-900 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-300 text-sm mb-4">
            An unexpected error occurred. Try again, or go back to the home
            page.
          </p>
          {error?.message && (
            <pre className="text-xs bg-slate-800/80 border border-slate-700 rounded p-3 overflow-auto max-h-48">
              {error.message}
            </pre>
          )}
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => reset()}
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm"
            >
              Try again
            </button>
            <a
              href="/"
              className="px-4 py-2 rounded border border-slate-600 text-slate-200 text-sm hover:bg-slate-800"
            >
              Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
