import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('humanizer_token')?.value;
  const { pathname } = request.nextUrl;

  // 1. Protect /admin routes and /admin/login
  if (pathname.startsWith('/admin')) {
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const payload = JSON.parse(jsonPayload);
        const isAdmin = payload.role === 'admin';

        // Block non-admin user from accessing /admin
        if (!isAdmin) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }

        // Redirect logged-in admin from legacy /admin/login to /admin/dashboard
        if (pathname === '/admin/login') {
          return NextResponse.redirect(new URL('/admin/dashboard', request.url));
        }
      }
    } catch {
      const loginUrl = new URL('/login', request.url);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('humanizer_token');
      return response;
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
