"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// Ưu tiên router.back() thay vì href cố định — quay đúng URL trước đó (còn
// nguyên ?tab=&taskFilter= của trang project, xem ProjectDetailTabs/
// ProjectTasksTable) thay vì luôn reset về tab mặc định. Chỉ fallback sang
// href tĩnh khi không có lịch sử điều hướng thật (mở thẳng link task từ
// ngoài, tab mới) — lúc đó router.back() có thể thoát khỏi app.
export function TaskBackLink({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const router = useRouter();

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <a
      href={`/projects/${projectId}`}
      onClick={handleClick}
      className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {projectName}
    </a>
  );
}
