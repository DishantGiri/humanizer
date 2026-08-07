import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('humanizer_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Intercept all /admin routes
  if (pathname.startsWith('/admin')) {
    // Unauthenticated user -> Redirect to /login with redirect parameter
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Redirect legacy /admin/login to /admin/dashboard
    if (pathname === '/admin/login') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  const authRoutes = ['/', '/login', '/register'];

  // If user has an active session token and tries to access /, /login, or /register (and no redirect param), redirect to /dashboard
  if (token && authRoutes.includes(pathname) && !request.nextUrl.searchParams.get('redirect')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect /dashboard route: if user is not logged in (no cookie), redirect to /login
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/login', '/register', '/dashboard/:path*', '/admin/:path*', '/admin'],
};
