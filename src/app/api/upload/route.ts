import { mkdir, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

import { logActivity } from "@/lib/actions/activity-log";
import { auth } from "@/lib/auth";
import { ForbiddenError, requireProjectRole } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import {
  MAX_FILES_PER_COMMENT,
  normalizeMimeType,
  validateFile,
} from "@/lib/validation/attachment";
import { createCommentSchema } from "@/lib/validation/task";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

// Tạo bình luận KÈM file đính kèm — nhận multipart nên phải là Route Handler
// (CLAUDE.md §1: chỉ upload/download đi qua app/api/**). Bình luận thuần chữ
// vẫn đi qua Server Action createComment (lib/actions/task.ts) — logic nghiệp
// vụ hai bên phải giữ giống nhau.
export async function POST(request: Request) {
  // Proxy bỏ qua /api — route tự kiểm quyền, trả 401 thay vì redirect.
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: "Chưa đăng nhập" }, { status: 401 });
  }
  const user = { id: session.user.id, role: session.user.role };

  const formData = await request.formData();
  const parsed = createCommentSchema.safeParse({
    taskId: formData.get("taskId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 },
    );
  }

  const task = await db.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { projectId: true, title: true },
  });
  if (!task) {
    return NextResponse.json({ ok: false, error: "Task không tồn tại" }, { status: 404 });
  }
  try {
    await requireProjectRole(task.projectId, user, ["ADMIN", "PM", "DEV"]);
  } catch (error) {
    if (error instanceof ForbiddenError) {
      // 404 chứ không phải 403 — không lộ sự tồn tại của task cho người ngoài (§2 mục 8)
      return NextResponse.json({ ok: false, error: "Task không tồn tại" }, { status: 404 });
    }
    throw error;
  }

  const files = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) {
    return NextResponse.json({ ok: false, error: "Chưa chọn file nào" }, { status: 400 });
  }
  if (files.length > MAX_FILES_PER_COMMENT) {
    return NextResponse.json(
      { ok: false, error: `Tối đa ${MAX_FILES_PER_COMMENT} file mỗi bình luận` },
      { status: 400 },
    );
  }
  for (const file of files) {
    const fileError = validateFile(file);
    if (fileError) {
      return NextResponse.json({ ok: false, error: fileError }, { status: 400 });
    }
  }

  // Ghi file xuống disk bằng key ngẫu nhiên — tên gốc chỉ lưu DB để hiển thị,
  // không bao giờ dùng làm đường dẫn (chống path traversal).
  await mkdir(UPLOAD_DIR, { recursive: true });
  const written: { storageKey: string; fileName: string; mimeType: string; size: number }[] = [];
  for (const file of files) {
    const storageKey = randomUUID();
    await writeFile(
      path.join(UPLOAD_DIR, storageKey),
      Buffer.from(await file.arrayBuffer()),
    );
    written.push({
      storageKey,
      fileName: file.name,
      mimeType: normalizeMimeType(file.type),
      size: file.size,
    });
  }

  try {
    await db.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          taskId: parsed.data.taskId,
          authorId: user.id,
          body: parsed.data.body,
        },
      });
      await tx.attachment.createMany({
        data: written.map((f) => ({ ...f, commentId: comment.id })),
      });
      await logActivity(
        tx,
        user.id,
        "COMMENT",
        `đã bình luận (kèm ${written.length} tệp) trong task "${task.title}"`,
        task.projectId,
      );
    });
  } catch (error) {
    // DB thất bại → dọn file đã ghi, không để rác trên disk
    await Promise.allSettled(
      written.map((f) => unlink(path.join(UPLOAD_DIR, f.storageKey))),
    );
    throw error;
  }

  return NextResponse.json({ ok: true });
}
