import { validateCsrfToken, getCsrfTokenFromRequest } from "./validate";

/**
 * CSRF protection middleware for state-changing routes.
 * Returns 403 if token is missing or invalid.
 */
export async function requireCsrf(req: Request): Promise<{ ok: boolean; error?: string; status?: number }> {
  const token = getCsrfTokenFromRequest(req);
  const valid = await validateCsrfToken(token);
  if (!valid) {
    return { ok: false, error: "Invalid or missing CSRF token", status: 403 };
  }
  return { ok: true };
}

