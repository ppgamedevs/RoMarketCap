import { cookies } from "next/headers";

/**
 * Validate CSRF token using double-submit cookie pattern.
 * Token must be present in both cookie and header/body.
 */
export async function validateCsrfToken(token: string | null): Promise<boolean> {
  if (!token) return false;

  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("csrf-token")?.value;

  if (!cookieToken) return false;

  // Compare tokens (constant-time comparison to prevent timing attacks)
  if (token.length !== cookieToken.length) return false;

  let match = 0;
  for (let i = 0; i < token.length; i++) {
    match |= token.charCodeAt(i) ^ cookieToken.charCodeAt(i);
  }

  return match === 0;
}

/**
 * Get CSRF token from request headers or body.
 */
export function getCsrfTokenFromRequest(req: Request): string | null {
  const header = req.headers.get("x-csrf-token");
  if (header) return header;

  // For POST requests, could also check body, but we'll use header for simplicity
  return null;
}

