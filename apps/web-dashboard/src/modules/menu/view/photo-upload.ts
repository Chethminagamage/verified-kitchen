"use client";

import { createClient } from "@/infrastructure/supabase/client";

import { coverCrop, MEDIA_BUCKET, PHOTO_QUALITY, photoProblem } from "../model/menu.model";

/*
 * Photos are prepared in the browser and uploaded straight to Supabase Storage
 * with the operator's own session (the Storage policies only allow their own
 * kitchen's folder). Only the small, resized JPEG ever leaves the computer.
 */

export type UploadResult = { ok: true; path: string } | { ok: false; message: string };

/** Crops from the centre to the target shape, resizes and compresses to JPEG. */
export async function preparePhoto(file: File, size: { width: number; height: number }): Promise<Blob> {
  // "from-image" applies the phone's rotation, so portrait photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { sx, sy, sw, sh } = coverCrop(bitmap.width, bitmap.height, size.width, size.height);
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("no canvas");
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, size.width, size.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", PHOTO_QUALITY),
    );
  } finally {
    bitmap.close();
  }
}

/** Validates, resizes and uploads a photo to `path`. Never throws: returns a message for the operator. */
export async function uploadPhoto(file: File, path: string, size: { width: number; height: number }): Promise<UploadResult> {
  const problem = photoProblem(file);
  if (problem) return { ok: false, message: problem };

  let blob: Blob;
  try {
    blob = await preparePhoto(file, size);
  } catch {
    return { ok: false, message: "This photo could not be read. Use a JPEG, PNG or WebP photo." };
  }

  const { error } = await createClient()
    .storage.from(MEDIA_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
  if (error) {
    const refused = /row-level security|unauthori[sz]ed|403/i.test(error.message);
    return {
      ok: false,
      message: refused
        ? "You do not have permission to upload photos for this kitchen."
        : "The photo could not be uploaded. Check your connection and try again.",
    };
  }
  return { ok: true, path };
}
