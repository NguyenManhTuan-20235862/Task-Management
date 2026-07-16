import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

// Proxy chỉ trả lời "đã đăng nhập hay chưa" để redirect cho đúng.
// Phân quyền chi tiết (role, membership) nằm ở lib/auth/guard.ts — không query DB ở đây.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.AUTH_URL?.startsWith("https://") ?? false,
  });
  const isLoggedIn = token !== null;
  const isLoginPage = pathname === "/login";

  if (!isLoggedIn && !isLoginPage) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua API (route handler tự kiểm quyền, trả 401 thay vì redirect) và file tĩnh
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
