import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient, Role, TaskStatus } from "@prisma/client";
import { hash } from "bcryptjs";

// Seed QUY MÔ LỚN để test UI/hiệu năng với nhiều dữ liệu — ĐỘC LẬP hoàn toàn
// với prisma/seed.ts và prisma/seed-demo.ts (không import, không gọi chung).
// Chạy: npm run db:seed:scale
//
// Idempotent theo kiểu "xoá sạch rồi dựng lại": mỗi lần chạy sẽ xoá TOÀN BỘ
// User role PM/DEV + Project/Task/Comment/ProjectMember/ActivityLog hiện có
// (giữ nguyên mọi User role ADMIN), rồi tạo lại từ đầu bằng dữ liệu xác định
// (không dùng Math.random()) — nên chạy lại bao nhiêu lần cũng ra đúng 1 kết
// quả giống hệt nhau. Muốn quay lại bộ dữ liệu nhỏ cũ thì chạy lại
// `npm run db:seed` + `npm run db:seed:demo`.

const SAMPLE_PASSWORD = "password123";

const PM_COUNT = 8;
const DEV_COUNT = 30;

// ---------------------------------------------------------------------------
// Bộ sinh số xác định (mulberry32) — thay cho Math.random() để mọi lần chạy
// script cho ra đúng cùng 1 bộ dữ liệu (task title nào, comment nào, tiến độ
// bao nhiêu %, mốc thời gian nào...). Seed cố định, không phụ thuộc ngày giờ.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260722);
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

// ---------------------------------------------------------------------------
// Ngày giờ
// ---------------------------------------------------------------------------
const NOW = new Date();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}
// Cho startDate/dueDate (@db.Date) — chỉ giữ phần ngày, neo UTC như seed-demo.ts.
function dateOnly(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}
function monthsAgo(months: number): Date {
  return addDays(NOW, -Math.round(months * 30));
}
function daysAgo(days: number): Date {
  return addDays(NOW, -days);
}
function clampToNow(date: Date): Date {
  return date.getTime() > NOW.getTime() ? new Date(NOW) : date;
}

// Cursor thời gian riêng cho từng project — đảm bảo mọi ActivityLog/Comment
// của project đó phát sinh theo đúng trình tự tăng dần và không vượt quá NOW.
function makeCursor(start: Date) {
  let current = clampToNow(start).getTime();
  return {
    peek: () => new Date(current),
    tick(minHours: number, maxHours: number): Date {
      const hours = minHours + rand() * (maxHours - minHours);
      current = Math.min(current + hours * 3_600_000, NOW.getTime());
      return new Date(current);
    },
  };
}

// ---------------------------------------------------------------------------
// Round-robin xác định: rải N "lượt" (project cần bao nhiêu PM/Dev) cho M
// "người" (PM/Dev cần được rải bao nhiêu project) mà không dùng ngẫu nhiên —
// dùng chung cho cả phân bổ PM lẫn phân bổ Dev.
// ---------------------------------------------------------------------------
function roundRobinSequence(counts: number[]): number[] {
  const remaining = [...counts];
  const seq: number[] = [];
  while (remaining.some((r) => r > 0)) {
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i] > 0) {
        seq.push(i);
        remaining[i]--;
      }
    }
  }
  return seq;
}
function consumeSequence(seq: number[], slotCounts: number[]): number[][] {
  let cursor = 0;
  return slotCounts.map((count) => {
    const chunk = seq.slice(cursor, cursor + count);
    cursor += count;
    return chunk;
  });
}

// ---------------------------------------------------------------------------
// Danh sách tên (tiếng Việt, tên hiển thị) — email đánh số cho gọn/dễ nhớ khi
// đăng nhập test (pm01@congty.com.vn .. pm08, dev01@congty.com.vn .. dev30).
// ---------------------------------------------------------------------------
const PM_NAMES = [
  "Nguyễn Đức Anh",
  "Trần Thị Minh Châu",
  "Phạm Quốc Bảo",
  "Lê Thị Ngọc Diễm",
  "Hoàng Văn Hùng",
  "Vũ Thị Kim Yến",
  "Đặng Minh Tuấn",
  "Bùi Thị Thu Hằng",
];
const DEV_NAMES = [
  "Nguyễn Văn An",
  "Trần Thị Bích",
  "Lê Minh Cường",
  "Phạm Thị Diệu",
  "Hoàng Văn Đạt",
  "Vũ Thị Giang",
  "Đặng Minh Hải",
  "Bùi Thị Hoa",
  "Đỗ Văn Huy",
  "Ngô Thị Huyền",
  "Dương Minh Khoa",
  "Lý Thị Lan",
  "Phan Văn Long",
  "Trịnh Thị Mai",
  "Nguyễn Minh Nam",
  "Trần Thị Ngọc",
  "Lê Văn Phát",
  "Phạm Thị Quyên",
  "Hoàng Minh Sơn",
  "Vũ Thị Thảo",
  "Đặng Văn Thịnh",
  "Bùi Thị Trang",
  "Đỗ Minh Trí",
  "Ngô Thị Tuyết",
  "Dương Văn Vinh",
  "Lý Thị Xuân",
  "Phan Minh Yên",
  "Trịnh Văn Bình",
  "Nguyễn Thị Cẩm",
  "Trần Minh Đức",
];
if (PM_NAMES.length !== PM_COUNT || DEV_NAMES.length !== DEV_COUNT) {
  throw new Error("Số lượng tên PM/Dev không khớp PM_COUNT/DEV_COUNT");
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const pms = PM_NAMES.map((name, i) => ({
  id: `scale-pm-${pad2(i + 1)}`,
  email: `pm${pad2(i + 1)}@congty.com.vn`,
  name,
}));
const devs = DEV_NAMES.map((name, i) => ({
  id: `scale-dev-${pad2(i + 1)}`,
  email: `dev${pad2(i + 1)}@congty.com.vn`,
  name,
}));

// ---------------------------------------------------------------------------
// 15 project — 4 "đã xong" + 7 "đang làm" + 4 "chưa làm" (đúng thứ tự nhóm,
// vì các mảng slot-count phân bổ Dev bên dưới dựa vào vị trí trong mảng này).
// ---------------------------------------------------------------------------
type ProjectGroup = "DONE" | "IN_PROGRESS" | "NOT_STARTED";
const PROJECT_DEFS: { id: string; name: string; group: ProjectGroup }[] = [
  { id: "scale-project-01", name: "Hệ thống chấm công nội bộ", group: "DONE" },
  { id: "scale-project-02", name: "Cổng thông tin tuyển dụng", group: "DONE" },
  { id: "scale-project-03", name: "Ứng dụng đặt lịch họp", group: "DONE" },
  { id: "scale-project-04", name: "Hệ thống quản lý hợp đồng", group: "DONE" },
  { id: "scale-project-05", name: "Nền tảng quản lý dự án nội bộ", group: "IN_PROGRESS" },
  { id: "scale-project-06", name: "Ứng dụng CSKH đa kênh", group: "IN_PROGRESS" },
  { id: "scale-project-07", name: "Hệ thống quản lý kho vận", group: "IN_PROGRESS" },
  { id: "scale-project-08", name: "Cổng thanh toán nội bộ", group: "IN_PROGRESS" },
  { id: "scale-project-09", name: "Ứng dụng khảo sát nhân viên", group: "IN_PROGRESS" },
  { id: "scale-project-10", name: "Hệ thống quản lý tài sản CNTT", group: "IN_PROGRESS" },
  { id: "scale-project-11", name: "Nền tảng đào tạo trực tuyến", group: "IN_PROGRESS" },
  { id: "scale-project-12", name: "Hệ thống quản lý ngân sách", group: "NOT_STARTED" },
  { id: "scale-project-13", name: "Ứng dụng quản lý xe công ty", group: "NOT_STARTED" },
  { id: "scale-project-14", name: "Cổng thông tin cổ đông", group: "NOT_STARTED" },
  { id: "scale-project-15", name: "Hệ thống quản lý bảo hành", group: "NOT_STARTED" },
];

// PM: 4 PM quản lý 3 project + 4 PM quản lý 2 project (tổng 20 lượt) —
// project: 10 project có 1 PM + 5 project có 2 PM (tổng 20 lượt) — khớp với
// "~5/15 project có 2 PM trở lên". idx % 3 === 0 → 5 project (0,3,6,9,12).
const pmProjectCounts = [3, 3, 3, 3, 2, 2, 2, 2];
const projectPmSlotCounts = PROJECT_DEFS.map((_, idx) => (idx % 3 === 0 ? 2 : 1));
const pmSlots = consumeSequence(roundRobinSequence(pmProjectCounts), projectPmSlotCounts);

// Dev: 2 Dev nhận 1 project + 28 Dev nhận 2 project (tổng 58 lượt) — 11
// project có task cần 4-5 Dev (4 project ×5 + 7 project ×4 = 48) + 4 project
// chưa làm cần 2-3 Dev (3+2+3+2=10) → tổng đúng 58, khớp tuyệt đối.
const devProjectCounts = Array.from({ length: DEV_COUNT }, (_, i) => (i < 2 ? 1 : 2));
const taskProjectDevCounts = [5, 4, 4, 5, 4, 4, 5, 4, 4, 5, 4]; // 11 project đầu (DONE+IN_PROGRESS)
const notStartedDevCounts = [3, 2, 3, 2]; // 4 project cuối
const projectDevSlotCounts = [...taskProjectDevCounts, ...notStartedDevCounts];
const devSlots = consumeSequence(roundRobinSequence(devProjectCounts), projectDevSlotCounts);

// ---------------------------------------------------------------------------
// Nội dung task/comment sinh theo mẫu (đủ đa dạng, không cần hàng trăm dòng
// viết tay) — kết hợp động từ + đối tượng để ra tiêu đề khác nhau hợp lý.
// ---------------------------------------------------------------------------
const TASK_VERBS = [
  "Thiết kế",
  "Xây dựng",
  "Phát triển",
  "Tích hợp",
  "Tối ưu",
  "Sửa lỗi",
  "Viết tài liệu",
  "Kiểm thử",
  "Refactor",
  "Nâng cấp",
  "Triển khai",
  "Cấu hình",
];
const TASK_OBJECTS = [
  "giao diện đăng nhập",
  "API xác thực người dùng",
  "module báo cáo thống kê",
  "luồng thanh toán",
  "trang danh sách dữ liệu",
  "hệ thống thông báo",
  "bộ lọc tìm kiếm nâng cao",
  "quy trình phê duyệt",
  "tính năng xuất file Excel",
  "module phân quyền",
  "trang cấu hình hệ thống",
  "luồng đồng bộ dữ liệu",
  "giao diện responsive di động",
  "hệ thống ghi log",
  "trang chi tiết",
  "chức năng gửi email tự động",
  "cơ chế cache dữ liệu",
  "trang tổng quan (dashboard)",
  "API tìm kiếm",
  "luồng đăng ký tài khoản",
];
const TASK_NOTES = [
  "Đảm bảo tương thích trên các trình duyệt phổ biến.",
  "Cần review kỹ trước khi merge vào nhánh chính.",
  "Ưu tiên hiệu năng và trải nghiệm người dùng.",
  "Phối hợp với team QA để kiểm thử đầy đủ.",
  "Tuân theo chuẩn thiết kế hệ thống hiện có.",
  "Cần viết unit test đi kèm.",
  "Kiểm tra kỹ các trường hợp biên (edge case).",
  "Đồng bộ với API backend mới nhất.",
];
const DEV_COMMENTS = [
  "Đã cập nhật tiến độ, đang tiếp tục phần còn lại.",
  "Gặp một số vướng mắc kỹ thuật, đang tìm hướng xử lý.",
  "Đã hoàn thành phần chính, còn vài chỗ cần tinh chỉnh.",
  "Đang chờ feedback trước khi làm tiếp.",
  "Đã test lại, mọi thứ hoạt động ổn định.",
  "Cần thêm thời gian để xử lý phần tích hợp.",
  "Đã đẩy code lên nhánh dev, mọi người review giúp.",
];
const PM_COMMENTS = [
  "Tiến độ ổn, tiếp tục theo kế hoạch nhé.",
  "Nhớ kiểm tra lại kỹ trước khi đóng task.",
  "Task này hơi chậm so với kế hoạch, cần đẩy nhanh hơn.",
  "Làm tốt lắm, chuyển sang task tiếp theo được rồi.",
  "Có gì vướng mắc thì báo lại ngay để hỗ trợ.",
  "Cần bổ sung thêm tài liệu hướng dẫn sử dụng.",
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

    // --- Bước 1: dọn dữ liệu — đúng thứ tự khoá ngoại, giữ nguyên mọi ADMIN ---
    await db.activityLog.deleteMany({});
    await db.comment.deleteMany({});
    await db.attachment.deleteMany({});
    await db.task.deleteMany({});
    await db.projectMember.deleteMany({});
    await db.project.deleteMany({});
    await db.user.deleteMany({ where: { role: { in: [Role.PM, Role.DEV] } } });

    // --- Bước 2: tạo user — PM + Dev, mật khẩu chung ---
    const passwordHash = await hash(SAMPLE_PASSWORD, 12);
    // User.createdAt rải trong 6-18 tháng trước — để bộ lọc "ngày tham gia" ở
    // /members có dữ liệu thật để test, không phải toàn bộ trùng 1 thời điểm.
    await db.user.createMany({
      data: pms.map((pm) => ({
        ...pm,
        role: Role.PM,
        passwordHash,
        createdAt: monthsAgo(randInt(6, 18)),
      })),
    });
    await db.user.createMany({
      data: devs.map((dev) => ({
        ...dev,
        role: Role.DEV,
        passwordHash,
        createdAt: monthsAgo(randInt(6, 18)),
      })),
    });

    // --- Bước 3-6: build từng project 1 lượt (project → member → task →
    // comment → activity log) để cursor thời gian theo đúng trình tự thật ---
    const projectRows: Prisma.ProjectCreateManyInput[] = [];
    const projectMemberRows: Prisma.ProjectMemberCreateManyInput[] = [];
    const taskRows: Prisma.TaskCreateManyInput[] = [];
    const commentRows: Prisma.CommentCreateManyInput[] = [];
    const activityRows: Prisma.ActivityLogCreateManyInput[] = [];

    PROJECT_DEFS.forEach((def, idx) => {
      const pmIndexes = pmSlots[idx];
      const devIndexes = devSlots[idx];
      const projectPms = pmIndexes.map((i) => pms[i]);
      const projectDevs = devIndexes.map((i) => devs[i]);
      const primaryPm = projectPms[0];

      // Ngày nghiệp vụ (startDate/dueDate) theo đúng nhóm trạng thái.
      let startDate: Date;
      let dueDate: Date;
      let t0: Date; // mốc "tạo project" trên trục ActivityLog — rải 1-6 tháng trước
      if (def.group === "DONE") {
        startDate = dateOnly(daysAgo(180 + idx * 7));
        dueDate = dateOnly(daysAgo(10 + idx * 3));
        t0 = monthsAgo(5 + rand());
      } else if (def.group === "IN_PROGRESS") {
        startDate = dateOnly(daysAgo(60 + idx * 5));
        dueDate = dateOnly(addDays(NOW, 30 + idx * 4));
        t0 = monthsAgo(1 + rand() * 2);
      } else {
        startDate = dateOnly(addDays(NOW, 7 + idx * 5));
        dueDate = dateOnly(addDays(NOW, 90 + idx * 5));
        t0 = daysAgo(14 + rand() * 14);
      }

      projectRows.push({
        id: def.id,
        name: def.name,
        createdBy: admin.id,
        startDate,
        dueDate,
        createdAt: t0,
      });

      const cursor = makeCursor(t0);
      activityRows.push({
        actorId: admin.id,
        projectId: def.id,
        type: "CREATE",
        message: `đã tạo dự án "${def.name}"`,
        createdAt: cursor.peek(),
      });

      for (const pm of projectPms) {
        const at = cursor.tick(1, 12);
        projectMemberRows.push({ projectId: def.id, userId: pm.id, createdAt: at });
        activityRows.push({
          actorId: admin.id,
          projectId: def.id,
          type: "CREATE",
          message: `đã thêm ${pm.name} làm PM cho dự án "${def.name}"`,
          createdAt: at,
        });
      }
      for (const dev of projectDevs) {
        const at = cursor.tick(1, 24);
        projectMemberRows.push({ projectId: def.id, userId: dev.id, createdAt: at });
        activityRows.push({
          actorId: primaryPm.id,
          projectId: def.id,
          type: "CREATE",
          message: `đã thêm ${dev.name} làm Dev cho dự án "${def.name}"`,
          createdAt: at,
        });
      }

      if (def.group === "NOT_STARTED") return; // chỉ member, không task

      const taskCount = randInt(10, 20);
      for (let t = 0; t < taskCount; t++) {
        const taskId = `scale-task-${pad2(idx + 1)}-${pad2(t + 1)}`;
        const assignee = projectDevs[t % projectDevs.length];

        // Ngày nghiệp vụ của task — nằm trong khoảng ngày của project.
        const spanDays = Math.max(
          1,
          Math.round((dueDate.getTime() - startDate.getTime()) / 86_400_000),
        );
        const taskStart = dateOnly(addDays(startDate, randInt(0, Math.max(1, spanDays - 3))));
        const taskDue = dateOnly(addDays(taskStart, randInt(3, 16)));
        const finalTaskDue = taskDue.getTime() < taskStart.getTime() ? taskStart : taskDue;

        let status: TaskStatus;
        let progress: number;
        if (def.group === "DONE") {
          status = "DONE";
          progress = 100;
        } else {
          const roll = rand();
          if (roll < 0.2) {
            status = "TODO";
            progress = 0;
          } else if (roll < 0.5) {
            status = "DONE";
            progress = 100;
          } else {
            status = "IN_PROGRESS";
            progress = randInt(10, 90);
          }
        }

        const title = `${pick(TASK_VERBS)} ${pick(TASK_OBJECTS)}`;
        const description = `${pick(TASK_NOTES)} ${pick(TASK_NOTES)}`;

        const createdAt = cursor.tick(4, 48);
        taskRows.push({
          id: taskId,
          projectId: def.id,
          title,
          description,
          startDate: taskStart,
          dueDate: finalTaskDue,
          assigneeId: assignee.id,
          progress,
          status,
          createdAt,
        });
        activityRows.push({
          actorId: primaryPm.id,
          projectId: def.id,
          type: "CREATE",
          message: `đã tạo task "${title}"`,
          createdAt,
        });

        // Tiến độ dần theo nấc — task TODO (progress=0) chưa ai đụng vào nên
        // không có log cập nhật tiến độ, chỉ có log "đã tạo task" ở trên.
        if (progress > 0) {
          const milestoneCount = progress === 100 ? randInt(3, 4) : randInt(2, 3);
          const milestones: number[] = [];
          for (let m = 1; m <= milestoneCount; m++) {
            milestones.push(Math.round((progress * m) / milestoneCount));
          }
          milestones[milestones.length - 1] = progress; // nấc cuối luôn đúng giá trị cuối
          for (const milestone of milestones) {
            const at = cursor.tick(6, 72);
            activityRows.push({
              actorId: assignee.id,
              projectId: def.id,
              type: "UPDATE",
              message:
                milestone === 100
                  ? `đã hoàn thành task "${title}"`
                  : `đã cập nhật tiến độ task "${title}" lên ${milestone}%`,
              createdAt: at,
            });
          }
        }

        // Comment — DONE có nhiều hơn (2-4, thể hiện trao đổi tới lúc xong),
        // chưa xong ít hơn (0-3, một số task chưa có comment cũng hợp lý).
        const commentCount = status === "DONE" ? randInt(2, 4) : randInt(0, 3);
        for (let c = 0; c < commentCount; c++) {
          const isDevAuthor = rand() < 0.7;
          const author = isDevAuthor ? assignee : pick(projectPms);
          const body = isDevAuthor ? pick(DEV_COMMENTS) : pick(PM_COMMENTS);
          const at = cursor.tick(4, 48);
          commentRows.push({
            id: `scale-comment-${pad2(idx + 1)}-${pad2(t + 1)}-${c + 1}`,
            taskId,
            authorId: author.id,
            body,
            createdAt: at,
          });
          activityRows.push({
            actorId: author.id,
            projectId: def.id,
            type: "COMMENT",
            message: `đã bình luận trong task "${title}"`,
            createdAt: at,
          });
        }
      }
    });

    // --- Ghi xuống DB theo đúng thứ tự phụ thuộc khoá ngoại ---
    await db.project.createMany({ data: projectRows });
    await db.projectMember.createMany({ data: projectMemberRows });
    await db.task.createMany({ data: taskRows });
    await db.comment.createMany({ data: commentRows });
    await db.activityLog.createMany({ data: activityRows });

    console.log(
      `Seed scale xong: ${PM_COUNT} PM, ${DEV_COUNT} Dev, ${projectRows.length} project ` +
        `(4 đã xong / 7 đang làm / 4 chưa làm), ${taskRows.length} task, ` +
        `${commentRows.length} comment, ${activityRows.length} activity log.`,
    );
    console.log(`Mật khẩu cho tất cả PM/Dev: ${SAMPLE_PASSWORD}`);
    console.log("Đăng nhập thử: pm01@congty.com.vn hoặc dev01@congty.com.vn");
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
