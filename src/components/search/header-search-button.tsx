import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";

// Lối vào nhanh tới /search — mọi thao tác gõ/lọc/sắp xếp diễn ra ở trang đó,
// header chỉ là 1 nút bấm (không phải ô nhập text) nên không cần "use client".
export function HeaderSearchButton() {
  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      className="h-8 w-full max-w-sm justify-start gap-2 font-normal text-muted-foreground"
      render={<Link href="/search" />}
    >
      <Search className="size-4" aria-hidden />
      Tìm dự án, task, thành viên...
    </Button>
  );
}
