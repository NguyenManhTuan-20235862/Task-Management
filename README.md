# Task Management

Hệ thống quản lý task nội bộ: Admin tạo project, PM tạo task giao cho Dev, Dev cập nhật tiến độ, mọi role đều comment được.

> Quy tắc nghiệp vụ, phân quyền, và quy ước code đầy đủ nằm ở [CLAUDE.md](./CLAUDE.md) — đó mới là nguồn sự thật, file này chỉ hướng dẫn chạy dự án.

## Tech stack

| Thành phần | Lựa chọn |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript strict |
| UI | Tailwind CSS + shadcn/ui (Base UI) |
| Database | PostgreSQL 16 chạy bằng Docker |
| ORM | Prisma 7 |
| Auth | Auth.js v5, Credentials provider, session JWT |
| Validation | Zod (dùng chung client + server) |
| Test | Vitest (unit) + Playwright (e2e) |

## 3 role

| Role | Việc chính |
|---|---|
| **Admin** | Tạo project, thêm PM vào project, xem toàn hệ thống |
| **PM** | Thêm/xoá Dev khỏi project mình quản lý, tạo/sửa/giao task, giám sát tiến độ |
| **Dev** | Xem task được giao, cập nhật tiến độ task của mình |

Mọi role đều comment và sửa comment của chính mình được. Không có màn hình đăng ký — tài khoản do Admin tạo hoặc từ seed script.

## Bắt đầu

> Hướng dẫn chi tiết từng bước + xử lý lỗi thường gặp: xem [SETUP.md](./SETUP.md).

**Yêu cầu:** Node.js 20 LTS, Docker Desktop.

```bash
npm install

cp .env.example .env
# điền DATABASE_URL, AUTH_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD

npm run db:up        # khởi động Postgres, đợi healthcheck xanh
npm run db:migrate   # tạo schema
npm run db:seed      # tạo tài khoản admin + PM/Dev mẫu + project/task demo

npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

### Tài khoản sau khi seed

| Role | Email | Mật khẩu |
|---|---|---|
| Admin | theo `SEED_ADMIN_EMAIL` trong `.env` | theo `SEED_ADMIN_PASSWORD` trong `.env` |
| PM / Dev mẫu | xem `prisma/seed.ts` | `Matkhau@123` |

## Lệnh thường dùng

```bash
npm run dev            # dev server
npm run build          # build production
npm run lint
npm run typecheck       # tsc --noEmit
npm test                # vitest
npm run test:e2e        # playwright

npm run db:up           # docker compose up -d
npm run db:down         # docker compose down
npm run db:migrate      # prisma migrate dev
npm run db:seed         # seed lại dữ liệu mẫu
npm run db:studio       # prisma studio (xem/sửa data trực tiếp)
```

Trước khi coi một thay đổi là xong: chạy `npm run typecheck` + `npm run lint` + test liên quan.

## Cấu trúc thư mục (rút gọn)

```
src/app/(auth)/login/     # đăng nhập — không có đăng ký
src/app/(app)/             # màn hình sau đăng nhập (theo role)
src/lib/actions/           # Server Actions
src/lib/validation/        # Zod schema dùng chung client + server
src/lib/auth/guard.ts      # hàm kiểm quyền — mọi action đều bắt đầu từ đây
prisma/schema.prisma       # nguồn sự thật duy nhất về data model
prisma/seed.ts             # tạo admin + PM/Dev + project/task mẫu
docker-compose.yml         # Postgres cho dev
```

Chi tiết đầy đủ về nghiệp vụ, ma trận phân quyền, và quy ước code: xem [CLAUDE.md](./CLAUDE.md).
