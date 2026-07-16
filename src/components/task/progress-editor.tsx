"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { TaskProgress } from "@/components/task/task-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateProgress } from "@/lib/actions/task";

function clamp(n: number) {
  return Math.min(100, Math.max(0, Math.round(n)));
}

export function ProgressEditor({
  taskId,
  initialProgress,
}: {
  taskId: string;
  initialProgress: number;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initialProgress);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateProgress({ taskId, progress: value });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="grid gap-3">
      <TaskProgress value={value} />
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(clamp(Number(e.target.value)))}
          className="h-2 flex-1 cursor-pointer accent-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Tiến độ (%)"
        />
        <Input
          type="number"
          min={0}
          max={100}
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(clamp(Number(e.target.value)))}
          className="w-20"
        />
        <Button
          onClick={submit}
          disabled={isPending || value === initialProgress}
        >
          {isPending ? "Đang lưu..." : "Cập nhật"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
