"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SEARCH_RETURN_KEY } from "@/components/search/search-return-path";

// Quay thẳng về trang đã bấm vào tìm kiếm (lưu bởi TrackLastPath) — KHÔNG dùng
// router.back(), vì mỗi lần đổi tab/filter/sort trên /search đều đẩy thêm 1
// bước lịch sử mới, back() sẽ chỉ lùi đúng 1 bước filter chứ không thoát hẳn
// khỏi /search.
export function SearchCloseButton() {
  const router = useRouter();

  function handleClick() {
    const returnTo = sessionStorage.getItem(SEARCH_RETURN_KEY) ?? "/";
    router.push(returnTo);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label="Đóng tìm kiếm, quay lại trang trước"
      onClick={handleClick}
    >
      <X aria-hidden />
    </Button>
  );
}
