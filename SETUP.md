# Hướng dẫn chạy dự án

Hướng dẫn từng bước để chạy Task Management trên máy local, kèm cách xử lý lỗi thường gặp. Bản tóm tắt nhanh xem ở [README.md](./README.md); nghiệp vụ/phân quyền đầy đủ xem ở [CLAUDE.md](./CLAUDE.md).

## 1. Yêu cầu hệ thống

- **Node.js 20 LTS** — kiểm tra bằng `node -v`
- **Docker Desktop** — phải **đang chạy** trước khi qua bước 3 (mở app Docker Desktop, đợi icon chuyển sang trạng thái "Running")
- **npm** (đi kèm Node.js)

Dự án **không** cài Postgres trực tiếp lên máy — Postgres chỉ chạy trong Docker.

## 2. Cài dependency

```bash
npm install
```

## 3. Tạo file môi trường

```bash
cp .env.example .env
```

Mở `.env` và điền các biến sau:

| Biến | Ý nghĩa | Ví dụ |
|---|---|---|
| `DATABASE_URL` | Chuỗi kết nối Postgres (đã có sẵn giá trị đúng cho Docker compose ở dưới, thường không cần đổi) | `postgresql://taskmgmt:taskmgmt@localhost:5433/taskmgmt?schema=public` |
| `AUTH_SECRET` | Khoá ký session, sinh ngẫu nhiên | chạy `openssl rand -base64 32` rồi dán vào |
| `SEED_ADMIN_EMAIL` | Email tài khoản Admin đầu tiên | `admin@congty.com.vn` |
| `SEED_ADMIN_PASSWORD` | Mật khẩu tài khoản Admin đầu tiên | tự đặt, đủ mạnh |

`SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD` chỉ dùng khi chạy `db:seed` (bước 5) để tạo tài khoản Admin — không phải biến của Next.js lúc runtime.

## 4. Khởi động Postgres bằng Docker

```bash
npm run db:up
```

Lệnh này chạy `docker compose up -d`, dùng cấu hình trong `docker-compose.yml` (Postgres 16, expose ở cổng **5433** trên host — không phải 5432, để tránh đụng Postgres cài sẵn nếu máy đã có).

Kiểm tra container đã khoẻ chưa:

```bash
docker ps --filter "name=taskmgmt-db"
```

Đợi cột `STATUS` hiện `(healthy)` rồi mới qua bước 5. Nếu chưa thấy container nào, xem mục Xử lý lỗi bên dưới.

## 5. Tạo schema + seed dữ liệu mẫu

```bash
npm run db:migrate   # tạo bảng theo prisma/schema.prisma
npm run db:seed      # tạo tài khoản Admin (từ .env) + PM/Dev mẫu + project/task demo
```

`db:seed` chạy được nhiều lần không tạo trùng dữ liệu (idempotent) — an tâm chạy lại nếu cần.

## 6. Chạy dev server

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) — sẽ tự chuyển tới `/login`.

## 7. Đăng nhập thử

| Role | Email | Mật khẩu |
|---|---|---|
| Admin | giá trị `SEED_ADMIN_EMAIL` bạn đặt ở bước 3 | giá trị `SEED_ADMIN_PASSWORD` bạn đặt ở bước 3 |
| PM | `ha.pm@congty.com.vn` hoặc `huy.pm@congty.com.vn` | `Matkhau@123` |
| Dev | `duc.dev@congty.com.vn`, `vy.dev@congty.com.vn`, hoặc `dung.dev@congty.com.vn` | `Matkhau@123` |

(Danh sách đầy đủ nằm trong `prisma/seed.ts` — nếu bạn sửa file đó thì bảng này có thể lệch, chạy lại `npm run db:seed` sau khi sửa.)

## Xử lý lỗi thường gặp

**`npm run db:up` báo lỗi kết nối Docker daemon**
Docker Desktop chưa mở hoặc chưa khởi động xong. Mở app Docker Desktop, đợi 30-60 giây rồi chạy lại.

**Cổng 3000 đã bị chiếm khi chạy `npm run dev`**
Next.js tự chuyển sang cổng 3001 và báo trong log. Nếu muốn chạy đúng cổng 3000, tìm tiến trình đang giữ cổng rồi tắt đi trước khi chạy lại.

**Prisma báo lỗi không kết nối được database**
Kiểm tra `npm run db:up` đã chạy và container đã `(healthy)` chưa (bước 4). Kiểm tra `DATABASE_URL` trong `.env` có đúng cổng `5433` không.

**Đổi `prisma/schema.prisma` xong mà code báo thiếu field/type**
Chạy `npx prisma generate` để sinh lại Prisma Client, sau đó **khởi động lại `npm run dev`** — dev server giữ Prisma Client cũ trong bộ nhớ nên chỉ generate lại không đủ.

**Muốn xoá sạch dữ liệu và làm lại từ đầu**
```bash
npm run db:down       # dừng container, KHÔNG xoá volume (giữ data)
```
Chỉ dùng `docker compose down -v` (xoá luôn volume `pgdata`) khi thực sự muốn xoá sạch DB — thao tác này không thể hoàn tác.

## Lệnh khác khi phát triển

```bash
npm run typecheck    # tsc --noEmit — chạy trước khi coi 1 thay đổi là xong
npm run lint
npm test              # vitest
npm run test:e2e      # playwright — cần dev server đang chạy
npm run db:studio     # Prisma Studio — xem/sửa data trực tiếp qua giao diện web
```
