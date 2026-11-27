"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { createClient } from "@/infrastructure/supabase/client";
import { useToast } from "@/shared/components/feedback/Toaster";
import { buttonClass, type ButtonTone } from "@/shared/components/form/button-styles";

import { MEDIA_BUCKET, type MenuActionState } from "../../model/menu.model";
import { uploadPhoto } from "../photo-upload";

interface PhotoPickerProps {
  /** Button text, e.g. "Add photo" or "Replace". */
  children: ReactNode;
  /** Accessible name when the visible text is short ("Add photo for Egg kottu"). */
  label: string;
  /** Storage path for the new file; called with a fresh time stamp per upload. */
  makePath: (stamp: number) => string;
  size: { width: number; height: number };
  /** Saves the uploaded path on the server (a server action). */
  save: (path: string) => Promise<MenuActionState>;
  tone?: ButtonTone;
  disabled?: boolean;
}

/**
 * Pick a photo -> resized in the browser -> uploaded to Storage -> path saved.
 * If saving fails, the just-uploaded file is removed again (nothing is left behind).
 */
export default function PhotoPicker({ children, label, makePath, size, save, tone = "outline", disabled }: PhotoPickerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadPhoto(file, makePath(Date.now()), size);
      if (!uploaded.ok) {
        toast({ tone: "critical", message: uploaded.message });
        return;
      }
      const saved = await save(uploaded.path);
      if (saved?.ok) {
        toast({ tone: "positive", message: saved.message });
      } else {
        await createClient().storage.from(MEDIA_BUCKET).remove([uploaded.path]);
        toast({ tone: "critical", message: saved?.message ?? "The photo could not be saved." });
      }
    } finally {
      setBusy(false);
      if (input.current) input.current.value = ""; // allow choosing the same file again
    }
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        aria-label={label}
        disabled={busy || disabled}
        onClick={() => input.current?.click()}
        className={buttonClass(tone, "sm")}
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
        {busy ? "Uploading…" : children}
      </button>
    </>
  );
}
