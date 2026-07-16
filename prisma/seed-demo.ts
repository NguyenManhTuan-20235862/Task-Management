import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

// Seed BỔ SUNG (không thay thế prisma/seed.ts) — thêm dữ liệu demo phong phú
// hơn để test UI với nhiều PM/Dev/project cùng lúc. Chạy: npm run db:seed:demo
// (chạy độc lập với `npm run db:seed`, không tự động kích hoạt bởi migrate reset).
// Cùng mật khẩu mẫu với prisma/seed.ts để nhất quán.
const SAMPLE_PASSWORD = "Matkhau@123";

const newPms = [
  { id: "demo-pm-khoi", email: "khoi.pm@congty.com.vn", name: "Đỗ Minh Khôi" },
  { id: "demo-pm-lananh", email: "lananh.pm@congty.com.vn", name: "Nguyễn Thị Lan Anh" },
  { id: "demo-pm-long", email: "long.pm@congty.com.vn", name: "Trịnh Bảo Long" },
];

const newDevs = [
  { id: "demo-dev-bao", email: "bao.dev@congty.com.vn", name: "Hoàng Gia Bảo" },
  { id: "demo-dev-trang", email: "trang.dev@congty.com.vn", name: "Đặng Thu Trang" },
  { id: "demo-dev-tuan", email: "tuan.dev@congty.com.vn", name: "Lý Anh Tuấn" },
  { id: "demo-dev-mai", email: "mai.dev@congty.com.vn", name: "Phan Ngọc Mai" },
  { id: "demo-dev-hieu", email: "hieu.dev@congty.com.vn", name: "Vương Đức Hiếu" },
  { id: "demo-dev-ngan", email: "ngan.dev@congty.com.vn", name: "Trần Kim Ngân" },
  { id: "demo-dev-son", email: "son.dev@congty.com.vn", name: "Bùi Xuân Sơn" },
];

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (!connectionString) throw new Error("Thiếu DATABASE_URL trong .env");
  if (!adminEmail) throw new Error("Thiếu SEED_ADMIN_EMAIL trong .env");

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });

  try {
    const admin = await db.user.findUniqueOrThrow({ where: { email: adminEmail } });
    const passwordHash = await hash(SAMPLE_PASSWORD, 12);

    for (const pm of newPms) {
      await db.user.upsert({
        where: { id: pm.id },
        update: {},
        create: { ...pm, role: Role.PM, passwordHash },
      });
    }
    for (const dev of newDevs) {
      await db.user.upsert({
        where: { id: dev.id },
        update: {},
        create: { ...dev, role: Role.DEV, passwordHash },
      });
    }

    const [khoi, lanAnh, long] = newPms;
    const [bao, trang, tuan, mai, hieu, ngan, son] = newDevs;

    const today = new Date();
    const daysFromNow = (n: number) => {
      const d = new Date(today);
      d.setDate(d.getDate() + n);
      d.setUTCHours(0, 0, 0, 0);
      return d;
    };

    // 4 project mới, mỗi project có đúng 1 PM quản lý khi tạo (giống rule của
    // createProject) — Đỗ Minh Khôi quản lý 2 project để minh hoạ "PM không
    // giới hạn số project". Hoàng Gia Bảo là Dev ở cả 2 project của Khôi để
    // minh hoạ "Dev có thể làm nhiều project cùng lúc" (CLAUDE.md §2 mục 1).
    const projects = [
      {
        id: "demo-project-warehouse",
        name: "Ứng dụng quản lý kho",
        pm: khoi,
        devs: [bao, trang],
        dates: { startDate: daysFromNow(-20), dueDate: daysFromNow(40) },
      },
      {
        id: "demo-project-crm",
        name: "Hệ thống CRM nội bộ",
        pm: lanAnh,
        devs: [tuan, mai],
        dates: { startDate: daysFromNow(-10), dueDate: daysFromNow(50) },
      },
      {
        id: "demo-project-hr",
        name: "Cổng thông tin nhân sự",
        pm: long,
        devs: [hieu, ngan],
        dates: { startDate: daysFromNow(-30), dueDate: daysFromNow(20) },
      },
      {
        id: "demo-project-sales-app",
        name: "Ứng dụng bán hàng di động",
        pm: khoi,
        devs: [son, bao],
        dates: { startDate: daysFromNow(-5), dueDate: daysFromNow(60) },
      },
    ] as const;

    for (const project of projects) {
      await db.project.upsert({
        where: { id: project.id },
        update: project.dates,
        create: {
          id: project.id,
          name: project.name,
          createdBy: admin.id,
          ...project.dates,
        },
      });

      for (const member of [project.pm, ...project.devs]) {
        await db.projectMember.upsert({
          where: { projectId_userId: { projectId: project.id, userId: member.id } },
          update: {},
          create: { projectId: project.id, userId: member.id },
        });
      }
    }

    // 12 task rải đều cho cả 7 Dev mới (mỗi Dev có ít nhất 1 task), đủ 3 trạng
    // thái + có vài task quá hạn để test stat "Quá hạn" trên dashboard.
    const tasks = [
      // Ứng dụng quản lý kho
      {
        id: "demo-task-warehouse-1",
        projectId: "demo-project-warehouse",
        title: "Thiết kế schema quản lý tồn kho",
        description: "Bảng sản phẩm, kho, phiếu nhập/xuất, lịch sử biến động tồn.",
        assignee: bao,
        startDate: daysFromNow(-18),
        dueDate: daysFromNow(-8),
        progress: 100,
        status: "DONE" as const,
      },
      {
        id: "demo-task-warehouse-2",
        projectId: "demo-project-warehouse",
        title: "Xây dựng API nhập/xuất kho",
        description: "Server Action tạo phiếu nhập/xuất, cập nhật tồn kho theo transaction.",
        assignee: bao,
        startDate: daysFromNow(-7),
        dueDate: daysFromNow(5),
        progress: 60,
        status: "IN_PROGRESS" as const,
      },
      {
        id: "demo-task-warehouse-3",
        projectId: "demo-project-warehouse",
        title: "Tích hợp máy quét mã vạch",
        description: "Kết nối thiết bị quét mã vạch qua Web Serial API cho màn nhập kho.",
        assignee: trang,
        startDate: daysFromNow(-10),
        dueDate: daysFromNow(-3),
        progress: 20,
        status: "IN_PROGRESS" as const, // chưa xong nhưng đã qua hạn -> quá hạn
      },
      // Hệ thống CRM nội bộ
      {
        id: "demo-task-crm-1",
        projectId: "demo-project-crm",
        title: "Xây dựng module quản lý khách hàng",
        description: "CRUD khách hàng, lịch sử liên hệ, gắn nhãn phân loại.",
        assignee: tuan,
        startDate: daysFromNow(-8),
        dueDate: daysFromNow(6),
        progress: 50,
        status: "IN_PROGRESS" as const,
      },
      {
        id: "demo-task-crm-2",
        projectId: "demo-project-crm",
        title: "Viết báo cáo doanh số theo tháng",
        description: "Tổng hợp doanh số theo nhân viên kinh doanh, xuất Excel.",
        assignee: mai,
        startDate: daysFromNow(2),
        dueDate: daysFromNow(14),
        progress: 0,
        status: "TODO" as const,
      },
      {
        id: "demo-task-crm-3",
        projectId: "demo-project-crm",
        title: "Tích hợp gửi email tự động",
        description: "Gửi email chăm sóc khách hàng theo kịch bản đã duyệt.",
        assignee: tuan,
        startDate: daysFromNow(-15),
        dueDate: daysFromNow(-6),
        progress: 100,
        status: "DONE" as const,
      },
      // Cổng thông tin nhân sự
      {
        id: "demo-task-hr-1",
        projectId: "demo-project-hr",
        title: "Thiết kế giao diện hồ sơ nhân viên",
        description: "Xem/sửa thông tin cá nhân, hợp đồng, phòng ban.",
        assignee: hieu,
        startDate: daysFromNow(-6),
        dueDate: daysFromNow(9),
        progress: 30,
        status: "IN_PROGRESS" as const,
      },
      {
        id: "demo-task-hr-2",
        projectId: "demo-project-hr",
        title: "Xây dựng module chấm công",
        description: "Chấm công qua GPS, duyệt đơn nghỉ phép, tổng hợp công theo tháng.",
        assignee: ngan,
        startDate: daysFromNow(-25),
        dueDate: daysFromNow(-12),
        progress: 40,
        status: "IN_PROGRESS" as const, // quá hạn
      },
      {
        id: "demo-task-hr-3",
        projectId: "demo-project-hr",
        title: "Viết tài liệu hướng dẫn sử dụng",
        description: "Hướng dẫn cho nhân viên mới, kèm ảnh chụp màn hình từng bước.",
        assignee: hieu,
        startDate: daysFromNow(-20),
        dueDate: daysFromNow(-15),
        progress: 100,
        status: "DONE" as const,
      },
      // Ứng dụng bán hàng di động
      {
        id: "demo-task-sales-1",
        projectId: "demo-project-sales-app",
        title: "Thiết kế màn hình giỏ hàng",
        description: "Giao diện giỏ hàng, áp mã giảm giá, tính phí vận chuyển.",
        assignee: son,
        startDate: daysFromNow(-4),
        dueDate: daysFromNow(10),
        progress: 70,
        status: "IN_PROGRESS" as const,
      },
      {
        id: "demo-task-sales-2",
        projectId: "demo-project-sales-app",
        title: "Tích hợp thanh toán VNPay",
        description: "Kết nối cổng thanh toán, xử lý callback xác nhận đơn hàng.",
        assignee: bao,
        startDate: daysFromNow(3),
        dueDate: daysFromNow(20),
        progress: 0,
        status: "TODO" as const,
      },
      {
        id: "demo-task-sales-3",
        projectId: "demo-project-sales-app",
        title: "Kiểm thử luồng đặt hàng trên iOS",
        description: "Test end-to-end từ chọn sản phẩm đến xác nhận đơn trên Safari/iOS.",
        assignee: son,
        startDate: daysFromNow(-3),
        dueDate: daysFromNow(1),
        progress: 100,
        status: "DONE" as const,
      },
    ];

    for (const task of tasks) {
      await db.task.upsert({
        where: { id: task.id },
        update: {},
        create: {
          id: task.id,
          projectId: task.projectId,
          title: task.title,
          description: task.description,
          assigneeId: task.assignee.id,
          startDate: task.startDate,
          dueDate: task.dueDate,
          progress: task.progress,
          status: task.status,
        },
      });
    }

    // Vài comment cho có tương tác thật giữa PM và Dev.
    const comments = [
      {
        id: "demo-comment-1",
        taskId: "demo-task-warehouse-2",
        authorId: khoi.id,
        body: "Nhớ xử lý trường hợp nhập kho âm số lượng nhé, tránh tồn kho bị lệch.",
      },
      {
        id: "demo-comment-2",
        taskId: "demo-task-warehouse-2",
        authorId: bao.id,
        body: "Đã thêm validate, số lượng nhập/xuất luôn phải là số dương.",
      },
      {
        id: "demo-comment-3",
        taskId: "demo-task-hr-2",
        authorId: long.id,
        body: "Task này quá hạn khá lâu rồi, bạn cập nhật tiến độ giúp mình với.",
      },
    ];

    for (const comment of comments) {
      await db.comment.upsert({
        where: { id: comment.id },
        update: {},
        create: comment,
      });
    }

    console.log(
      `Seed demo xong: ${newPms.length} PM mới, ${newDevs.length} Dev mới, ` +
        `${projects.length} project mới, ${tasks.length} task mới, ${comments.length} comment mới.`,
    );
    console.log("Mật khẩu cho tất cả PM/Dev mới:", SAMPLE_PASSWORD);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
