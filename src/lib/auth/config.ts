import { compare, hashSync } from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation/auth";

// Hash giả để so sánh khi email không tồn tại — giữ thời gian phản hồi
// tương đương trường hợp email có thật, tránh lộ email nào tồn tại (timing attack).
const DUMMY_HASH = hashSync("dummy-password-khong-dung-that", 12);

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 24h — role trong JWT có thể cũ, chấp nhận trong tối đa 1 ngày
  },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        // Luôn chạy compare kể cả khi user không tồn tại (xem DUMMY_HASH)
        const passwordOk = await compare(
          password,
          user?.passwordHash ?? DUMMY_HASH,
        );
        if (!user || !passwordOk) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      // user chỉ có ở lần đăng nhập; các request sau chỉ có token
      if (user?.id) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
  },
} satisfies NextAuthConfig;
