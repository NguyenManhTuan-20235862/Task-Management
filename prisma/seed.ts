import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

// Hệ thống không có đăng ký — seed là cách duy nhất tạo tài khoản ban đầu.
// Admin lấy thông tin từ .env; PM/Dev dùng mật khẩu mẫu bên dưới (chỉ cho dev).

const SAMPLE_PASSWORD = "Matkhau@123";

const sampleUsers: { email: string; name: string; role: Role }[] = [
  { email: "ha.pm@congty.com.vn", name: "Trần Thu Hà", role: Role.PM },
  { email: "huy.pm@congty.com.vn", name: "Lê Quang Huy", role: Role.PM },
  { email: "duc.dev@congty.com.vn", name: "Phạm Minh Đức", role: Role.DEV },
  { email: "vy.dev@congty.com.vn", name: "Ngô Thảo Vy", role: Role.DEV },
  { email: "dung.dev@congty.com.vn", name: "Vũ Tiến Dũng", role: Role.DEV },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!connectionString) throw new Error("Thiếu DATABASE_URL trong .env");
  if (!adminEmail || !adminPassword) {
    throw new Error("Thiếu SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD trong .env");
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    await db.user.upsert({
      where: { email: adminEmail },
      update: {},
      create: {
        email: adminEmail,
        name: "Quản trị viên",
        role: Role.ADMIN,
        passwordHash: await hash(adminPassword, 12),
      },
    });

    const samplePasswordHash = await hash(SAMPLE_PASSWORD, 12);
    for (const user of sampleUsers) {
      await db.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, passwordHash: samplePasswordHash },
      });
    }

    const admin = await db.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const ha = await db.user.findUniqueOrThrow({ where: { email: "ha.pm@congty.com.vn" } });
    const duc = await db.user.findUniqueOrThrow({ where: { email: "duc.dev@congty.com.vn" } });
    const vy = await db.user.findUniqueOrThrow({ where: { email: "vy.dev@congty.com.vn" } });

    const today = new Date();
    const daysFromNow = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      return d;
    };

    // Id đặt cố định để seed chạy lại nhiều lần không tạo trùng (idempotent).
    // update có startDate/dueDate để lần seed sau tự sửa lại giá trị backfill
    // tạm thời của migration add_project_dates thành ngày mẫu thật.
    const projectDates = { startDate: daysFromNow(-14), dueDate: daysFromNow(30) };
    const project = await db.project.upsert({
      where: { id: "seed-project-website" },
      update: projectDates,
      create: {
        id: "seed-project-website",
        name: "Website nội bộ",
        createdBy: admin.id,
        ...projectDates,
      },
    });

    for (const userId of [ha.id, duc.id, vy.id]) {
      await db.projectMember.upsert({
        where: { projectId_userId: { projectId: project.id, userId } },
        update: {},
        create: { projectId: project.id, userId },
      });
    }

    await db.task.upsert({
      where: { id: "seed-task-1" },
      update: {},
      create: {
        id: "seed-task-1",
        projectId: project.id,
        title: "Thiết kế lại trang đăng nhập",
        description:
          "Áp dụng shadcn/ui, hỗ trợ dark mode, kiểm tra lại trên tablet.",
        startDate: daysFromNow(-5),
        dueDate: daysFromNow(2),
        assigneeId: duc.id,
        progress: 45,
        status: "IN_PROGRESS",
      },
    });

    await db.task.upsert({
      where: { id: "seed-task-2" },
      update: {},
      create: {
        id: "seed-task-2",
        projectId: project.id,
        title: "Viết tài liệu API cho module Task",
        description: "Liệt kê các Server Action, input/output, mã lỗi trả về.",
        startDate: daysFromNow(0),
        dueDate: daysFromNow(7),
        assigneeId: vy.id,
        progress: 0,
        status: "TODO",
      },
    });

    await db.task.upsert({
      where: { id: "seed-task-3" },
      update: {},
      create: {
        id: "seed-task-3",
        projectId: project.id,
        title: "Tối ưu tốc độ tải trang chủ",
        description: "Nén ảnh, lazy-load, kiểm tra lại Core Web Vitals.",
        startDate: daysFromNow(-10),
        dueDate: daysFromNow(-2),
        assigneeId: duc.id,
        progress: 100,
        status: "DONE",
      },
    });

    await db.comment.upsert({
      where: { id: "seed-comment-1" },
      update: {},
      create: {
        id: "seed-comment-1",
        taskId: "seed-task-1",
        authorId: ha.id,
        body: "Nhớ kiểm tra lại contrast của nút đăng nhập trên dark mode nhé.",
      },
    });

    await db.comment.upsert({
      where: { id: "seed-comment-2" },
      update: {},
      create: {
        id: "seed-comment-2",
        taskId: "seed-task-1",
        authorId: duc.id,
        body: "Đã sửa, đang chờ review lại phần responsive trên tablet.",
      },
    });

    const count = await db.user.count();
    console.log(`Seed xong: ${count} user, 1 project, 3 task mẫu.`);
    console.log(`Xem thử: http://localhost:3000/tasks/seed-task-1`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
