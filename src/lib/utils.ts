import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Input type="date" trả về "yyyy-MM-dd" — dựng mốc 00:00/23:59:59.999 theo giờ
// địa phương trình duyệt bằng new Date(y, m, d, ...) thay vì parse chuỗi kèm
// "Z" (mốc đó neo vào UTC, lệch múi giờ VN +7h so với giờ hiển thị cho người dùng).
// Chỉ dùng cho filter lọc tại chỗ (client-side) so với timestamp hiển thị local time.
export function startOfLocalDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

export function endOfLocalDay(value: string): Date {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d, 23, 59, 59, 999)
}

// Chỉ nhập 1 trong 2 ô "Từ ngày"/"Đến ngày" (ô còn lại để trống) -> hiểu là lọc
// đúng 1 ngày đó, không phải khoảng mở — đỡ phải nhập cả 2 ô khi chỉ cần tìm
// trong 1 ngày cụ thể. Nhập cả 2 ô mới thành khoảng from..to như bình thường.
export function matchesLocalDateRange(date: Date, from: string, to: string): boolean {
  if (!from && !to) return true
  if (from && !to) return date >= startOfLocalDay(from) && date <= endOfLocalDay(from)
  if (!from && to) return date >= startOfLocalDay(to) && date <= endOfLocalDay(to)
  return date >= startOfLocalDay(from) && date <= endOfLocalDay(to)
}

const DIACRITIC_MARKS = /[̀-ͯ]/g

// Bỏ dấu tiếng Việt để so khớp không phân biệt dấu — gõ "he"/"u" (không dấu)
// vẫn tìm ra "Hệ"/"ứng". NFD tách ký tự có dấu thành chữ gốc + dấu phụ (dải
// U+0300-036F) rồi loại bỏ dấu phụ; "đ" xử lý riêng vì không tách được qua NFD.
export function stripDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(DIACRITIC_MARKS, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
}

function normalizeSearchText(value: string): string {
  return stripDiacritics(value).toLowerCase().trim()
}

// Điểm mức độ giống nhau giữa target và từ khoá tìm kiếm (đã chuẩn hoá bỏ dấu,
// không phân biệt hoa/thường) — dùng để sắp xếp kết quả giống nhất lên đầu.
// Trả về -1 nếu không khớp (loại khỏi kết quả); từ khoá rỗng luôn trả về 0
// (khớp tất cả, giữ nguyên thứ tự gốc vì mọi item cùng điểm).
export function searchMatchScore(target: string, query: string): number {
  const q = normalizeSearchText(query)
  if (!q) return 0
  const t = normalizeSearchText(target)
  const index = t.indexOf(q)
  if (index === -1) return -1
  if (t === q) return 300 // khớp chính xác toàn bộ chuỗi
  if (index === 0) return 200 - t.length // khớp ngay đầu chuỗi, chuỗi càng ngắn càng "cô đọng"
  const prevChar = t[index - 1]
  if (prevChar === " " || prevChar === "-" || prevChar === "_" || prevChar === "/") {
    return 100 - index // khớp ngay đầu 1 từ trong chuỗi
  }
  return 50 - index // khớp ở giữa chuỗi bất kỳ vị trí nào, càng sớm điểm càng cao
}
