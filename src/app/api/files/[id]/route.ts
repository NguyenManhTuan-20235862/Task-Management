import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { ForbiddenError, requireProjectRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { IMAGE_MIME_TYPES } from "@/lib/validation/attachment";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Tải file có kiểm quyền — KHÔNG serve thư mục uploads dạng static (CLAUDE.md §8).
// Chỉ thành viên project (hoặc Admin) chứa attachment mới đọc được.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }
  const user = { id: session.user.id, role: session.user.role };

  const { id } = await params;
  const attachment = await db.attachment.findUnique({
    where: { id },
    select: {
      fileName: true,
      mimeType: true,
      storageKey: true,
      // Attachment thuộc task HOẶC comment (XOR) — lấy projectId từ nhánh có dữ liệu
      task: { select: { projectId: true } },
      comment: { select: { task: { select: { projectId: true } } } },
    },
  });
  const projectId =
    attachment?.task?.projectId ?? attachment?.comment?.task.projectId;
  if (!attachment || !projectId) {
    return NextResponse.json({ ok: false, error: "File không tồn tại" }, { status: 404 });
  }

  try {
    await requireProjectRole(projectId, user, ["ADMIN", "PM", "DEV"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      // 404 — không lộ sự tồn tại của file cho người ngoài project (§2 mục 8)
      return NextResponse.json({ ok: false, error: "File không tồn tại" }, { status: 404 });
    }
    throw error;
  }

  let data: Buffer;
  try {
    // storageKey là UUID do server sinh — không chứa input người dùng
    data = await readFile(path.join(UPLOAD_DIR, attachment.storageKey));
  } catch {
    return NextResponse.json(
      { ok: false, error: "File không còn trên hệ thống" },
      { status: 404 },
    );
  }

  // Ảnh cho hiển thị inline (thumbnail trong comment); tài liệu ép tải về.
  // filename* theo RFC 5987 để tên tiếng Việt không vỡ.
  const disposition = IMAGE_MIME_TYPES.has(attachment.mimeType)
    ? "inline"
    : "attachment";
  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Length": String(data.byteLength),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
