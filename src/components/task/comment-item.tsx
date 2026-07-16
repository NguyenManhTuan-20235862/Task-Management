"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user/user-avatar";
import { updateComment } from "@/lib/actions/task";

export function CommentItem({
  id,
  authorName,
  body,
  createdAt,
  updatedAt,
  canEdit,
}: {
  id: string;
  authorName: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const wasEdited = updatedAt.getTime() !== createdAt.getTime();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateComment({ commentId: id, body: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setIsEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-3">
      <UserAvatar name={authorName} size="sm" />
      <div className="grid flex-1 gap-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">{authorName}</span>
          <span className="text-xs text-muted-foreground">
            {format(createdAt, "d MMM, HH:mm", { locale: vi })}
            {wasEdited && " · đã chỉnh sửa"}
          </span>
        </div>

        {isEditing ? (
          <div className="grid gap-2">
            <Textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={isPending}
              rows={3}
            />
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={submit}
                disabled={isPending || !value.trim() || value === body}
              >
                {isPending ? "Đang lưu..." : "Lưu"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => {
                  setValue(body);
                  setError(null);
                  setIsEditing(false);
                }}
              >
                Huỷ
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm whitespace-pre-wrap text-foreground">{body}</p>
            {canEdit && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Sửa
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
