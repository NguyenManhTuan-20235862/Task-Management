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

    const count = await db.user.count();
    console.log(`Seed xong: ${count} user (1 admin, 2 PM, 3 Dev).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
