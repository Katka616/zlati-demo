import { NextRequest, NextResponse } from 'next/server';

const PASSWORD = 'ZlatiRemeslnici2026';

export function middleware(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth && auth.startsWith('Basic ')) {
    const decoded = atob(auth.slice(6));
    const idx = decoded.indexOf(':');
    const pass = idx >= 0 ? decoded.slice(idx + 1) : '';
    if (pass === PASSWORD) return NextResponse.next();
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Zlati Remeslnici - Demo"',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
