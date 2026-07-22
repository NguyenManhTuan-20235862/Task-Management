// Rule upload dùng chung client (pre-check UX) + server (check thật ở route
// handler). CLAUDE.md §3: chỉ ảnh + tài liệu, tối đa 10MB/file.

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_COMMENT = 5;

// mime -> nhãn hiển thị. Browser trên Windows gửi zip là "application/x-zip-compressed"
// — chấp nhận cả hai, chuẩn hoá về "application/zip" trước khi lưu.
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/gif": "GIF",
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "Excel",
  "application/zip": "ZIP",
  "application/x-zip-compressed": "ZIP",
};

export const IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

// Loại file trình duyệt tự render được (không cần tải về) khi tải qua
// api/files/[id] — ảnh (xem IMAGE_MIME_TYPES) + PDF (trình duyệt có viewer sẵn).
// docx/xlsx/zip không có cách render trong trình duyệt nên vẫn ép tải về.
export const INLINE_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, "application/pdf"]);

// Giá trị cho thuộc tính accept của <input type="file">
export const ACCEPT_ATTRIBUTE = Object.keys(ALLOWED_MIME_TYPES).join(",");

export function normalizeMimeType(mime: string): string {
  return mime === "application/x-zip-compressed" ? "application/zip" : mime;
}

// Trả về thông báo lỗi tiếng Việt, hoặc null nếu file hợp lệ.
export function validateFile(file: { type: string; size: number; name: string }): string | null {
  if (!(file.type in ALLOWED_MIME_TYPES)) {
    return `"${file.name}" không được hỗ trợ — chỉ nhận ảnh (PNG/JPEG/WebP/GIF), PDF, Word, Excel, ZIP`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `"${file.name}" vượt quá 10MB`;
  }
  return null;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
