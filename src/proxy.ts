import { NextResponse, type NextRequest } from "next/server";

// Deve coincidere con SESSION_COOKIE in src/lib/auth.ts (che non è importabile
// qui perché usa il database).
const SESSION_COOKIE = "vivamed_session";

/**
 * Controllo "ottimistico": chi non ha il cookie di sessione viene mandato
 * subito al login. La verifica vera (sessione valida, ruolo) avviene in ogni
 * pagina e in ogni Server Action.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|setup|api/health|_next/static|_next/image|logo.png).*)"],
};
