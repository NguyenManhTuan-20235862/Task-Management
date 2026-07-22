"use client";

import { useRef } from "react";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { useUpdateSearchParams } from "@/components/search/use-search-url";
import type { ParsedSearchParams } from "@/lib/validation/search";

const PLACEHOLDER: Record<ParsedSearchParams["type"], string> = {
  project: "Tìm theo tên dự án...",
  task: "Tìm theo tiêu đề hoặc mô tả task...",
  member: "Tìm theo tên hoặc email...",
  activity: "Tìm theo nội dung hoặc người thực hiện...",
};

// Ô tìm kiếm riêng cho tab đang chọn — chỉ so khớp trên field của đúng loại dữ
// liệu đang xem (xem lib/queries/search.ts), khác ô ở header (đã đổi thành nút
// bấm mở /search, không còn nhập được ở đó). Submit bằng Enter, không debounce
// theo từng ký tự — đổi tab sẽ đổi luôn placeholder + reset q (xem SearchTabs).
export function SearchQueryInput({
  type,
  value,
}: {
  type: ParsedSearchParams["type"];
  value: string;
}) {
  const update = useUpdateSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const q = inputRef.current?.value.trim() ?? "";
    update({ q: q || null });
  }

  return (
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        key={`${type}:${value}`}
        ref={inputRef}
        defaultValue={value}
        placeholder={PLACEHOLDER[type]}
        className="pl-8"
        aria-label={PLACEHOLDER[type]}
      />
    </form>
  );
}
