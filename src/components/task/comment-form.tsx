"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment } from "@/lib/actions/task";
import {
  ACCEPT_ATTRIBUTE,
  MAX_FILES_PER_COMMENT,
  formatFileSize,
  validateFile,
} from "@/lib/validation/attachment";

export function CommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addFiles(list: FileList | null) {
    if (!list) return;
    setError(null);
    const next = [...files];
    for (const file of list) {
      if (next.length >= MAX_FILES_PER_COMMENT) {
        setError(`Tối đa ${MAX_FILES_PER_COMMENT} file mỗi bình luận`);
        break;
      }
      const fileError = validateFile(file);
      if (fileError) {
        setError(fileError);
        continue;
      }
      next.push(file);
    }
    setFiles(next);
    // reset để chọn lại cùng 1 file vẫn trigger onChange
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onSubmit(formData: FormData) {
    setError(null);
    const body = String(formData.get("body") ?? "");
    startTransition(async () => {
      if (files.length === 0) {
        // Không có file → đi đường Server Action như cũ
        const result = await createComment({ taskId, body });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        // Có file → multipart qua Route Handler (Server Action không nhận file — CLAUDE.md §1)
        const upload = new FormData();
        upload.set("taskId", taskId);
        upload.set("body", body);
        for (const file of files) upload.append("files", file);
        const res = await fetch("/api/upload", { method: "POST", body: upload });
        const result = (await res.json()) as { ok: boolean; error?: string };
        if (!result.ok) {
          setError(result.error ?? "Gửi bình luận thất bại");
          return;
        }
      }
      formRef.current?.reset();
      setFiles([]);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={onSubmit} className="grid gap-2">
      <Textarea
        name="body"
        placeholder="Viết bình luận..."
        required
        disabled={isPending}
        rows={3}
      />

      {files.length > 0 && (
        <ul className="grid gap-1.5">
          {files.map((file, i) => (
            <li
              key={`${file.name}-${i}`}
              className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm"
            >
              <Paperclip className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
              <button
                type="button"
                aria-label={`Bỏ file ${file.name}`}
                disabled={isPending}
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
                className="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isPending || files.length >= MAX_FILES_PER_COMMENT}
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip data-icon="inline-start" aria-hidden />
          Đính kèm
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang gửi..." : "Gửi bình luận"}
        </Button>
      </div>
    </form>
  );
}
