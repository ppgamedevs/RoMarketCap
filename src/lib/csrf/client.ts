/**
 * Client-side helper for CSRF-protected fetch requests.
 * Automatically includes CSRF token from cookie in request headers.
 */

let csrfTokenCache: string | null = null;

/**
 * Get CSRF token from server (sets cookie and returns token).
 */
export async function getCsrfToken(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  try {
    const res = await fetch("/api/csrf", { method: "GET", credentials: "include" });
    if (!res.ok) throw new Error("Failed to get CSRF token");
    const data = await res.json();
    csrfTokenCache = data.token ?? null;
    if (!csrfTokenCache) {
      throw new Error("CSRF token not received");
    }
    return csrfTokenCache;
  } catch (error) {
    console.error("[csrf] Failed to get token:", error);
    throw error;
  }
}

/**
 * Clear CSRF token cache (call when token might be invalid).
 */
export function clearCsrfTokenCache() {
  csrfTokenCache = null;
}

/**
 * Fetch with CSRF token automatically included.
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getCsrfToken();
  const headers = new Headers(options.headers);
  headers.set("x-csrf-token", token);

  return fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });
}

