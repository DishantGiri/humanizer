import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('humanizer_token')?.value;
  const { pathname } = request.nextUrl;

  const authRoutes = ['/', '/login', '/register'];

  // If user has an active session token and tries to access /, /login, or /register, redirect to /dashboard
  if (token && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect /dashboard route: if user is not logged in (no cookie), redirect to /login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/dashboard/:path*'],
};
