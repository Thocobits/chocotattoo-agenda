import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const publicPaths = ["/login", "/api/whatsapp", "/api/auth"];

function isPublicPath(pathname: string) {
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/anamnese/form/")) return true;
  if (pathname.startsWith("/anamnese/approve/")) return true;
  if (pathname.startsWith("/api/anamnese/form/")) return true;
  if (pathname.startsWith("/api/anamnese/approve/")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Arquivos estáticos (logo, manifest, PWA, ícones)
  if (/\.(png|jpg|jpeg|svg|ico|webp|js|json|woff2?)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const isPublic = isPublicPath(pathname);

  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|logo.png|manifest.json|sw.js|icons/).*)"],
};
