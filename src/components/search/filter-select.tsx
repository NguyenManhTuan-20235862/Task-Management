"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const FILTER_ALL = "all";

// Select "Tất cả..." dùng chung giữa filter bar của /search (URL-based) và các
// browser lọc tại chỗ trên /projects, /members (client state) — tách ra để 2
// nơi không lặp lại cách xử lý gotcha `items` prop (CLAUDE.md §5).
export function FilterSelect({
  value,
  allLabel,
  options,
  onChange,
}: {
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  const items = {
    [FILTER_ALL]: allLabel,
    ...Object.fromEntries(options.map((o) => [o.value, o.label])),
  };

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => onChange(v === FILTER_ALL ? null : v)}
    >
      <SelectTrigger size="sm" className="w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={FILTER_ALL}>{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
