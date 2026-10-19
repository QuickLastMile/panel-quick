import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken, ROLE_ALLOWED_PATHS } from '@/lib/auth';

// Chequeo optimista: valida la cookie de sesión y redirige. La verificación
// completa (y el filtrado por rol de lo que se renderiza) vuelve a pasar en
// cada layout/página server-side — este proxy es solo la primera barrera.
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  const role = session?.role ?? null;

  if (pathname === '/login') {
    if (role) return NextResponse.redirect(new URL(ROLE_ALLOWED_PATHS[role][0] || '/dashboard', request.url));
    return NextResponse.next();
  }

  if (!role) {
    const url = new URL('/login', request.url);
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const allowed = ROLE_ALLOWED_PATHS[role];
  const canAccess = allowed.includes(pathname);
  if (!canAccess) {
    // Algunos roles (ej. "onboarding") no tienen "/dashboard" en su lista —
    // mandarlos siempre ahí crearía un redirect loop. Se manda a la primera
    // ruta permitida de su rol.
    return NextResponse.redirect(new URL(allowed[0] || '/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/login'],
};
