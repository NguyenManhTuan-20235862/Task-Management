"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, X } from "lucide-react";
import type { Role } from "@prisma/client";

import { FilterSelect } from "@/components/search/filter-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user/user-avatar";
import { roleMeta } from "@/lib/constants/role";
import { matchesLocalDateRange, searchMatchScore } from "@/lib/utils";

type MemberItem = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
  memberCount: number;
};

const roleOptions = (["ADMIN", "PM", "DEV"] as const).map((r) => ({
  value: r,
  label: roleMeta[r].label,
}));

// value "all" của FilterSelect nhân đôi làm sentinel "giữ nguyên sắp xếp mặc định"
// (vai trò rồi tên, giống thứ tự server trả về) — không có option "default" riêng
// vì FilterSelect luôn có sẵn 1 lựa chọn "Tất cả..." đóng vai trò đó.
const sortOptions = [
  { value: "joined_desc", label: "Tham gia gần đây" },
  { value: "joined_asc", label: "Tham gia lâu nhất" },
];

// Lọc/sắp xếp tại chỗ trên danh sách member Admin đã có sẵn — không đổi URL,
// không gọi lại server (cùng cơ chế với ProjectsBrowser).
export function MembersBrowser({ members }: { members: MemberItem[] }) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [sort, setSort] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Điểm giống nhau lấy max(tên, email) — khớp ở tên hay email đều tính, không
  // phân biệt dấu tiếng Việt (searchMatchScore). Có từ khoá thì ưu tiên xếp
  // giống nhất lên đầu; dropdown "sort" chỉ là tiêu chí phụ khi điểm bằng nhau
  // (hoặc là tiêu chí chính khi không gõ từ khoá, vì mọi người đều điểm 0).
  const filtered = members
    .map((member) => ({
      member,
      score: Math.max(searchMatchScore(member.name, query), searchMatchScore(member.email, query)),
    }))
    .filter(({ score }) => score >= 0)
    .filter(({ member }) => role === "all" || member.role === role)
    .filter(({ member }) => matchesLocalDateRange(member.createdAt, from, to))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (sort === "joined_desc") return b.member.createdAt.getTime() - a.member.createdAt.getTime();
      if (sort === "joined_asc") return a.member.createdAt.getTime() - b.member.createdAt.getTime();
      return 0;
    })
    .map(({ member }) => member);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="pl-8"
            aria-label="Tìm thành viên"
          />
        </div>
        <FilterSelect
          value={role}
          allLabel="Tất cả vai trò"
          options={roleOptions}
          onChange={(v) => setRole(v ?? "all")}
        />
        <FilterSelect
          value={sort}
          allLabel="Mặc định (vai trò, tên)"
          options={sortOptions}
          onChange={(v) => setSort(v ?? "all")}
        />
        <Input
          type="date"
          aria-label="Tham gia từ ngày"
          className="h-8 w-fit"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input
          type="date"
          aria-label="Tham gia đến ngày"
          className="h-8 w-fit"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        {(from || to) && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Xoá bộ lọc thời gian"
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            <X aria-hidden />
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Không tìm thấy thành viên nào khớp. Thử từ khoá khác hoặc bỏ bớt bộ lọc.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Thành viên</th>
                <th className="px-4 py-2.5 font-medium">Email</th>
                <th className="px-4 py-2.5 font-medium">Vai trò</th>
                <th className="px-4 py-2.5 font-medium">Dự án</th>
                <th className="px-4 py-2.5 font-medium">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((member) => (
                <tr
                  key={member.id}
                  className={member.role !== "ADMIN" ? "hover:bg-muted/40" : undefined}
                >
                  <td className="px-4 py-3">
                    {member.role === "ADMIN" ? (
                      <div className="flex items-center gap-2.5">
                        <UserAvatar name={member.name} size="sm" />
                        <div className="grid gap-0">
                          <span className="font-medium">{member.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {roleMeta[member.role].description}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <Link
                        href={`/members/${member.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <UserAvatar name={member.name} size="sm" />
                        <div className="grid gap-0">
                          <span className="font-medium hover:underline underline-offset-4">
                            {member.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {roleMeta[member.role].description}
                          </span>
                        </div>
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{member.email}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{roleMeta[member.role].label}</Badge>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {member.role === "ADMIN" ? "Tất cả" : member.memberCount}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {format(member.createdAt, "dd/MM/yyyy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
