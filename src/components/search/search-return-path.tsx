"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Khoá sessionStorage lưu "trang trước khi vào /search" — dùng chung giữa
// TrackLastPath (ghi) và SearchCloseButton (đọc).
export const SEARCH_RETURN_KEY = "search:returnTo";

// Ghi nhớ trang gần nhất KHÔNG PHẢI /search. router.back() không dùng được cho
// nút "X" vì mỗi lần đổi tab/filter/sort trên /search đều đẩy thêm 1 bước lịch
// sử mới (router.push) — back() chỉ lùi đúng 1 bước filter, không thoát hẳn
// khỏi /search. Component này render ở layout (mọi trang) để luôn có sẵn giá
// trị "quay về đâu" trước khi người dùng vào /search.
export function TrackLastPath() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/search") {
      sessionStorage.setItem(SEARCH_RETURN_KEY, pathname);
    }
  }, [pathname]);

  return null;
}
