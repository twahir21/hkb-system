"use client";

import { t } from "@/lib/i18n";
/* eslint-disable @next/next/no-img-element */

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import {
  createNews,
  updateNews,
  type ActionState,
} from "@/features/news/actions/news.actions";
import { isAllowedImage } from "@/features/news/validators/news.schema";
import type { NewsRow } from "@/features/news/news.types";

const inputCls =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
const labelSpanCls =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

/** Downscale large photos in the browser so uploads stay under the 4 MB cap. */
async function compressImage(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 2 * 1024 * 1024) {
      bitmap.close();
      return file;
    }
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
    );
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

function Feedback({ state }: { state: ActionState }) {
  return (
    <>
      {state.error && <p className="text-sm text-rose-600">{state.error}</p>}
      {state.ok && state.message && (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          {state.message}
        </p>
      )}
    </>
  );
}

export function NewsForm({
  article,
  onDone,
}: {
  article?: NewsRow | null;
  onDone?: () => void;
}) {
  const editing = Boolean(article);
  const fileRef = useRef<HTMLInputElement>(null);

  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    editing ? updateNews : createNews,
    { ok: false }
  );

  const [preview, setPreview] = useState<string>(article?.coverImageUrl ?? "");
  const [fileError, setFileError] = useState("");
  const [removeCover, setRemoveCover] = useState(false);

  // Close the modal once the save succeeds (the action revalidates /news).
  useEffect(() => {
    if (state.ok && onDone) onDone();
  }, [state.ok, onDone]);

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const original = input.files?.[0];
    setFileError("");
    if (!original) return;

    const processed = await compressImage(original);
    if (processed !== original) {
      try {
        const dt = new DataTransfer();
        dt.items.add(processed);
        input.files = dt.files;
      } catch {
        // DataTransfer unsupported — keep the original file in the input.
      }
    }

    const finalFile = input.files?.[0] ?? original;
    const invalid = isAllowedImage(finalFile);
    if (invalid) {
      setFileError(invalid);
      input.value = "";
      return;
    }
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(finalFile));
    setRemoveCover(false);
  };

  const clearCover = () => {
    if (fileRef.current) fileRef.current.value = "";
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setPreview("");
    setRemoveCover(true);
    setFileError("");
  };

  return (
    <form action={formAction} className="space-y-4">
      {article && <input type="hidden" name="id" value={article.id} />}
      <input type="hidden" name="removeCover" value={removeCover ? "true" : "false"} />

      <label className="block">
        <span className={labelSpanCls}>{t.news.title}</span>
        <input
          name="title"
          required
          defaultValue={article?.title ?? ""}
          className={inputCls}
          placeholder={t.news.titlePlaceholder}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={labelSpanCls}>{t.news.slug}</span>
          <input
            name="slug"
            defaultValue={article?.slug ?? ""}
            className={inputCls}
            placeholder={t.news.slugPlaceholder}
          />
        </label>
        <label className="block">
          <span className={labelSpanCls}>{t.news.categoryOptional}</span>
          <input
            name="category"
            defaultValue={article?.category ?? ""}
            className={inputCls}
            placeholder={t.news.categoryPlaceholder}
          />
        </label>
      </div>

      <label className="block">
        <span className={labelSpanCls}>{t.news.summary}</span>
        <textarea
          name="summary"
          defaultValue={article?.summary ?? ""}
          rows={2}
          className={inputCls}
          placeholder={t.news.summaryPlaceholder}
        />
      </label>

      <label className="block">
        <span className={labelSpanCls}>{t.news.content}</span>
        <textarea
          name="body"
          required
          defaultValue={article?.body ?? ""}
          rows={8}
          className={inputCls}
          placeholder={t.news.contentPlaceholder}
        />
      </label>

      <div className="space-y-2">
        <span className={labelSpanCls}>{t.news.cover}</span>
        {preview ? (
          <div className="flex items-start gap-3">
            <img
              src={preview}
              alt={t.news.coverPreview}
              className="h-24 w-40 rounded-lg border border-slate-200 object-cover"
            />
            <Button type="button" variant="ghost" size="sm" onClick={clearCover}>
              {t.news.removeImage}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">{t.news.noImage}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          name="coverFile"
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={handleFile}
          className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-brand-700"
        />
        <p className="text-xs text-slate-400">
          {t.news.fileHint}
        </p>
        {fileError && <p className="text-sm text-rose-600">{fileError}</p>}
        <input
          name="coverImageUrl"
          defaultValue={article?.coverImageUrl ?? ""}
          className={inputCls}
          placeholder={t.news.urlPlaceholder}
        />
      </div>

      <label className="block">
        <span className={labelSpanCls}>{t.common.status}</span>
        <select name="status" defaultValue={article?.status ?? "DRAFT"} className={inputCls}>
          <option value="DRAFT">{t.news.draft}</option>
          <option value="PUBLISHED">{t.news.published}</option>
          <option value="ARCHIVED">{t.news.archived}</option>
        </select>
      </label>

      <Feedback state={state} />

      <div className="flex justify-end gap-2 pt-2">
        {onDone && (
          <Button type="button" variant="secondary" size="sm" onClick={onDone}>
            {t.common.cancel}
          </Button>
        )}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? t.common.saving : editing ? t.cov.saveChanges : t.news.create}
        </Button>
      </div>
    </form>
  );
}
