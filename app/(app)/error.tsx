"use client";

import { useEffect } from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HomeError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 py-20 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden />
      <p className="text-sm text-muted-foreground">
        Không tải được trang. Có thể do mất kết nối mạng hoặc lỗi hệ thống.
      </p>
      <Button variant="outline" onClick={reset}>
        Thử lại
      </Button>
    </div>
  );
}
