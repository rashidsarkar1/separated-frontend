const TOKEN_KEY = "dokan.auth.token";
const EXPIRY_KEY = "dokan.auth.expiresAt";
export const AUTH_EXPIRED_EVENT = "dokan:auth-expired";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(TOKEN_KEY);
  const expiresAt = Number(window.localStorage.getItem(EXPIRY_KEY));
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    if (token) clearAuthSession();
    return null;
  }
  return token;
}

export function saveAuthSession(token: string, expiresAt: number) {
  window.localStorage.setItem(TOKEN_KEY, token);
  window.localStorage.setItem(EXPIRY_KEY, String(expiresAt));
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(EXPIRY_KEY);
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
}

export function getAuthorizationHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    clearAuthSession();
    throw new Error("Please sign in to continue.");
  }
  return { Authorization: `Bearer ${token}` };
}

export function handleUnauthorizedResponse(status: number) {
  if (status === 401) clearAuthSession();
}
