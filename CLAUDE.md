# CLAUDE.md — Task Management

@AGENTS.md

Hệ thống quản lý task nội bộ: Admin tạo project, PM tạo task giao cho Dev, Dev cập nhật tiến độ, mọi role comment được.

> Repo hiện đang ở giai đoạn khởi tạo. File này là **nguồn sự thật** về nghiệp vụ, phân quyền và quy ước code. Khi code đã tồn tại mà lệch với file này, hãy hỏi lại trước khi sửa theo bên nào.

---

## 1. Tech stack

| Thành phần | Lựa chọn |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Next.js 16 (App Router) + TypeScript (strict) |
| UI | Tailwind CSS + shadcn/ui |
| Database | **PostgreSQL 16 chạy bằng Docker** (xem §7) |
| ORM | Prisma |
| Auth | Auth.js (NextAuth v5), Credentials provider, session JWT |
| Validation | Zod — dùng chung cho form (client) và Server Action (server) |
| Upload | Local disk `./uploads` (dev) qua Route Handler; S3-compatible ở prod |
| Test | Vitest (unit) + Playwright (e2e các luồng phân quyền) |

Ưu tiên **Server Components + Server Actions**. Chỉ tạo Route Handler (`app/api/**`) cho upload/download file. Không dựng REST API riêng nếu Server Action làm được.

---

## 2. Nghiệp vụ & phân quyền (phần quan trọng nhất)

3 role: `ADMIN`, `PM`, `DEV`. Role là **toàn cục** (`User.role`): một người là PM thì là PM ở mọi project mình tham gia. `ProjectMember` chỉ trả lời câu hỏi **ai thuộc project nào** (phạm vi nhìn thấy), không mang role riêng — "project mình quản lý" của PM nghĩa là project mà PM đó là thành viên.

| Hành động | ADMIN | PM | DEV |
|---|---|---|---|
| Tạo / sửa / xoá project | ✅ | ❌ | ❌ |
| Thêm PM vào project | ✅ | ❌ | ❌ |
| Thêm Dev vào project | ✅ | ✅ (project mình quản lý) | ❌ |
| Xoá Dev khỏi project | ✅ | ✅ (project mình quản lý; chặn nếu Dev còn task) | ❌ |
| Tạo / sửa task | ❌ | ✅ (project mình quản lý) | ❌ |
| Giao task cho Dev | ❌ | ✅ | ❌ |
| Cập nhật tiến độ (%) của task | ❌ | ✅ (giám sát) | ✅ (chỉ task được giao cho mình) |
| Comment (kèm file/ảnh) | ✅ | ✅ | ✅ |
| Sửa / xoá comment | ✅ (mọi comment) | ✅ (comment của mình) | ✅ (comment của mình) |
| Xem project / task | Tất cả | Project mình là thành viên | Project mình là thành viên |

### Ràng buộc nghiệp vụ bắt buộc kiểm tra

1. **PM có thể quản lý nhiều project, không giới hạn số lượng.** (Rule "tối đa 2 project" từng tồn tại đã được gỡ bỏ theo quyết định 15/07/2026 — không thêm lại giới hạn khi chưa được yêu cầu.)
2. **Chỉ Admin thêm được PM vào project.** PM không tự thêm PM khác vào project mình quản lý, kể cả project do chính PM đó quản lý — PM chỉ thêm được Dev.
3. **Xoá thành viên khỏi project: chỉ xoá được Dev, và chặn nếu Dev còn task trong project đó.** Trả lỗi rõ ràng yêu cầu giao lại task cho Dev khác trước — giữ invariant "assignee luôn là thành viên project". Việc gỡ PM khỏi project chưa có trong phạm vi.
4. **Không có đăng ký.** Chỉ có màn hình đăng nhập. Tài khoản do Admin tạo (hoặc seed script). Tuyệt đối không tạo route `/register`, `/signup`.
5. **Task luôn thuộc về đúng 1 project** và **được giao cho đúng 1 Dev**: assignee bắt buộc, phải có `User.role = DEV` **và** là thành viên của project đó. Prisma không enforce được điều này — kiểm tra ở Zod schema / Server Action (chỉ PM tạo/sửa/giao task — Admin không tự gán task cho ai).
6. `startDate <= dueDate`. Cả hai đều bắt buộc — áp dụng cho cả Task **và** Project (Admin bắt buộc nhập ngày bắt đầu/kết thúc khi tạo project).
7. `progress` là số nguyên `0..100`. `100` ⇒ status tự chuyển `DONE`; `>0 && <100` ⇒ `IN_PROGRESS`.
8. Người ngoài project **không đọc được** task/comment của project đó — kể cả khi biết id.

### Nguyên tắc kiểm quyền

Mọi Server Action / Route Handler **bắt đầu bằng** một hàm guard trả về user + quyền trên tài nguyên; không được tin `role` gửi từ client, không được ẩn nút ở UI rồi coi đó là bảo mật.

```ts
// lib/auth/guard.ts — hình mẫu
const { user } = await requireUser();                    // 401 nếu chưa login
await requireProjectRole(projectId, user, ["ADMIN","PM"]); // 403 nếu không đủ quyền
await requireTaskAssignee(taskId, user);                  // Dev chỉ sửa task của mình
```

---

## 3. Data model

**Nguồn sự thật duy nhất là `prisma/schema.prisma` — KHÔNG copy schema vào file này** (hai bản chắc chắn lệch nhau sau vài lần migrate).

Các quyết định thiết kế cần biết khi đụng vào schema:

- `ProjectMember` **không có cột role** — quyền hạn luôn lấy từ `User.role` toàn cục (xem §2).
- `Project` cũng có `startDate`/`dueDate` (giống `Task`) — Admin bắt buộc nhập cả hai khi tạo project.
- Ràng buộc Prisma không enforce được, **bắt buộc check ở Zod + Server Action**: assignee là DEV và là thành viên project; `progress` 0..100; `startDate <= dueDate` (cả Task lẫn Project); Attachment thuộc đúng 1 trong 2 (`taskId` XOR `commentId` — bổ sung CHECK constraint bằng SQL trong migration đầu tiên).
- `startDate`/`dueDate` (Task và Project) lưu `@db.Date` (chỉ ngày, nghiệp vụ tính theo ngày, tránh lệch timezone); mọi timestamp khác là `timestamptz`.
- Xoá project → cascade sang member/task/comment/attachment. **Không** cascade khi xoá User (`onDelete: Restrict` trên task/comment) — user có dữ liệu thì không xoá được.

Upload: chỉ nhận ảnh (`image/png|jpeg|webp|gif`) và tài liệu (`pdf`, `docx`, `xlsx`, `zip`), tối đa **10MB/file**. Tên file gốc chỉ để hiển thị; lưu bằng key ngẫu nhiên. Tải file qua route có kiểm quyền, không serve thẳng thư mục `uploads`.

---

## 4. Cấu trúc thư mục

```
app/
  (auth)/login/            # chỉ có login, không có register
  (app)/
    projects/              # ADMIN: tạo/quản lý; PM/DEV: chỉ project của mình
    projects/[id]/tasks/
    tasks/[id]/            # chi tiết task + tiến độ + comment
    my-tasks/              # màn hình chính của DEV
    dashboard/             # màn hình PM xem hàng ngày: task theo trạng thái, quá hạn, tiến độ
  api/files/[id]/          # download có kiểm quyền
  api/upload/              # nhận file
lib/
  auth/                    # authOptions, guard.ts
  actions/                 # Server Actions: project.ts, task.ts, comment.ts
  validation/              # Zod schemas dùng chung client + server
  db.ts                    # Prisma singleton
prisma/
  schema.prisma
  seed.ts                  # tạo sẵn admin + vài PM/Dev (vì không có đăng ký)
docker-compose.yml
```

---

## 5. Quy ước code

- **TypeScript strict**, không `any`. Không ép kiểu bằng `as` để cho qua lỗi.
- Mọi input đi vào server (Server Action, Route Handler) **phải parse bằng Zod** trước khi dùng.
- Mutation → Server Action → `revalidatePath()`; không tự fetch lại bằng `useEffect`.
- Query Prisma **luôn kèm điều kiện phạm vi** (`where: { project: { members: { some: { userId } } } }`), không lọc quyền ở tầng JS sau khi đã lấy hết dữ liệu.
- Lỗi nghiệp vụ trả về dạng `{ ok: false, error: "..." }` để form hiển thị, không throw ra 500.
- **Xử lý lỗi tập trung bằng wrapper `safeAction()`** (`lib/actions/safe-action.ts`): bọc mọi Server Action, bắt `ForbiddenError`/`ZodError` và format về `{ ok: false, error }` thống nhất — không try/catch lặp lại trong từng action.
- **Mọi màn hình danh sách phải đủ 3 trạng thái**: loading (`loading.tsx` với skeleton đúng hình dạng nội dung), error (`error.tsx`), và empty state có hướng dẫn hành động tiếp theo.
- Component đặt tên tiếng Anh; text hiển thị cho người dùng bằng **tiếng Việt**.
- Không commit `.env`. Mẫu biến môi trường để ở `.env.example`.

---

## 6. Lệnh thường dùng

```bash
npm run dev            # Next.js dev server
npm run build          # build production
npm run lint
npm run typecheck      # tsc --noEmit
npm test               # vitest
npm run test:e2e       # playwright

npm run db:up          # docker compose up -d  (khởi động Postgres)
npm run db:down        # docker compose down
npm run db:migrate     # prisma migrate dev
npm run db:seed        # tạo admin + user mẫu
npm run db:studio      # prisma studio
```

Trước khi báo "xong" một thay đổi: chạy `npm run typecheck` + `npm run lint` + test liên quan.

---

## 7. Database bằng Docker

Postgres **chỉ chạy trong Docker**, không cài Postgres trực tiếp lên máy. `docker-compose.yml`:

```yaml
services:
  db:
    image: postgres:16-alpine
    container_name: taskmgmt-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: taskmgmt
      POSTGRES_PASSWORD: taskmgmt
      POSTGRES_DB: taskmgmt
    ports:
      - "5433:5432"   # 5433 phía host: máy dev có Postgres cài sẵn chiếm 5432
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskmgmt"]
      interval: 5s
      timeout: 5s
      retries: 5
volumes:
  pgdata:
```

`.env`:
```
DATABASE_URL="postgresql://taskmgmt:taskmgmt@localhost:5433/taskmgmt?schema=public"
AUTH_SECRET="<openssl rand -base64 32>"
```

Quy trình mỗi lần bắt đầu: `npm run db:up` → đợi healthcheck xanh → `npm run db:migrate`. Dữ liệu nằm trong volume `pgdata`; **không** `docker compose down -v` trừ khi thực sự muốn xoá sạch DB (hỏi trước khi làm).

---

## 8. Việc KHÔNG được làm

- Tạo luồng đăng ký / self-signup dưới mọi hình thức.
- Cho PM tự thêm PM khác vào project (kể cả project mình quản lý) — chỉ Admin làm việc này.
- Xoá Dev khỏi project khi Dev còn task trong project đó (kể cả task DONE).
- Cho Admin tạo/sửa/giao task hoặc cập nhật tiến độ — task là việc của PM (tạo/sửa/giao, giám sát tiến độ) và Dev (cập nhật tiến độ task của mình).
- Cho Dev sửa task không phải của mình, hoặc sửa field ngoài `progress` (+ comment).
- Serve thư mục `uploads` như static, hoặc trả file mà không kiểm quyền.
- Lưu mật khẩu chưa hash; log ra `passwordHash`, token, hay nội dung `.env`.
- Chạy `prisma migrate reset` / xoá volume DB mà chưa được đồng ý.

---

## 9. Ưu tiên triển khai (thứ tự gợi ý)

1. Docker Postgres + Prisma schema + seed (admin, 2 PM, 3 Dev).
2. Auth login-only + guard phân quyền + middleware chặn route.
3. CRUD Project (Admin) + thêm thành viên.
4. CRUD Task (PM) — ngày bắt đầu/kết thúc, assignee.
5. Cập nhật tiến độ % (Dev) + đồng bộ status.
6. Comment + đính kèm file/ảnh (mọi role).
7. Dashboard PM xem hàng ngày (task quá hạn, tiến độ trung bình theo project).
8. Audit log: bảng `ActivityLog` ghi từ trong action các thao tác quan trọng (tạo/sửa task, đổi tiến độ, xoá comment) — nuôi luôn mục "hoạt động gần đây" trên dashboard.
