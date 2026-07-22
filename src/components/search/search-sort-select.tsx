"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateSearchParams } from "@/components/search/use-search-url";

export function SearchSortSelect({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string }[];
}) {
  const update = useUpdateSearchParams();
  // Select.Root cần prop `items` (value -> label) để SelectValue hiện đúng
  // nhãn thay vì raw value (CLAUDE.md §5 — gotcha đã gặp ở 4 form khác).
  const items = Object.fromEntries(options.map((o) => [o.value, o.label]));

  return (
    <Select
      items={items}
      value={value}
      onValueChange={(v) => v && update({ sort: v })}
    >
      <SelectTrigger size="sm" className="w-fit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
