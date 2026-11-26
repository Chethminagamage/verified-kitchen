"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { RefreshCw, TriangleAlert } from "lucide-react";

export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="mx-auto mt-24 max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
        <TriangleAlert className="h-6 w-6 text-amber-600" />
      </div>

      <h2 className="mt-4 text-lg font-semibold text-slate-900">
        This page could not load its data
      </h2>

      <p className="mt-2 text-sm text-slate-600">
        The monitoring database may be unreachable. Check your connection
        and try again.
      </p>

      {error.digest && (
        <p className="mt-2 font-mono text-xs text-slate-400">
          Reference: {error.digest}
        </p>
      )}

      <button
        type="button"
        onClick={() => retry()}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </button>
    </section>
  );
}
