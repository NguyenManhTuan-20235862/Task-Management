import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Prisma 7 bắt buộc dùng driver adapter thay vì đọc url từ schema
function createClient() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

declare global {
  var prismaGlobal: PrismaClient | undefined;
}

// Singleton: tránh mở pool kết nối mới sau mỗi lần hot-reload ở dev
export const db = globalThis.prismaGlobal ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaGlobal = db;
}
