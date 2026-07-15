"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment } from "@/lib/actions/task";

export function CommentForm({ taskId }: { taskId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    const body = String(formData.get("body") ?? "");
    startTransition(async () => {
      const result = await createComment({ taskId, body });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
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
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Đính kèm file/ảnh sẽ có ở bước sau.
        </p>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Đang gửi..." : "Gửi bình luận"}
        </Button>
      </div>
    </form>
  );
}
