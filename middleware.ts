import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Define public routes
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow API routes to pass through without auth check
  const isApiRoute = request.nextUrl.pathname.startsWith('/api');
  if (isApiRoute) {
    return response;
  }

  // Try to get user with error handling
  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (error) {
    console.error('Middleware auth error:', error);
    // If auth fails, treat as unauthenticated
  }

  // Redirect to login if not authenticated and trying to access protected route
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect to dashboard if authenticated and trying to access auth pages
  if (user && isPublicRoute) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - PWA files (sw.js, workbox, manifest.json, offline)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|workbox-.*\\.js|fallback-.*\\.js|manifest\\.json|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
