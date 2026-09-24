import { NextResponse } from "next/server";

export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/profile/:path*", "/favorites/:path*", "/recommendations/:path*", "/admin/:path*"]
};
