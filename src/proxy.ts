import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

export function proxy(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    const [user, pwd] = atob(authValue).split(':');

    const expectedUser = process.env.BASIC_AUTH_USER;
    const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

    if (user === expectedUser && pwd === expectedPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Auth Required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}
