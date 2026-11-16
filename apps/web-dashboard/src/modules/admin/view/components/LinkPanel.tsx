"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

import type { ActionState } from "../../model/admin.model";

type Link = NonNullable<NonNullable<ActionState>["link"]>;

/**
 * A one-time link to hand to a person (WhatsApp, SMS or email). Shown once:
 * it is not stored anywhere, so a new one is created when needed.
 */
export default function LinkPanel({ link }: { link: Link }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
        <Link2 className="h-4 w-4" />
        {link.purpose === "setup" ? "Set-up link" : "Password reset link"} for {link.recipient}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Send it to them privately. It works once and expires (1 hour by default: the &quot;Email OTP
        expiration&quot; setting of Supabase&apos;s email sign-in). Anyone with the link can set this
        account&apos;s password.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          readOnly
          value={link.url}
          aria-label="Link"
          onFocus={(e) => e.currentTarget.select()}
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 font-mono text-xs text-slate-700"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
