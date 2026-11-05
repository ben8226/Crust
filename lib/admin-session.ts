/** Client-side admin session (same 24-hour window as the admin dashboard). */

export const ADMIN_SESSION_HOURS = 24;

export function isAdminSessionActive(): boolean {
  if (typeof window === "undefined") return false;
  const isAuthenticated = localStorage.getItem("adminAuthenticated") === "true";
  const authTimestamp = localStorage.getItem("adminAuthTimestamp");
  if (!isAuthenticated || !authTimestamp) return false;
  const timestamp = parseInt(authTimestamp, 10);
  if (Number.isNaN(timestamp)) return false;
  const hoursSinceAuth = (Date.now() - timestamp) / (1000 * 60 * 60);
  if (hoursSinceAuth >= ADMIN_SESSION_HOURS) {
    localStorage.removeItem("adminAuthenticated");
    localStorage.removeItem("adminAuthTimestamp");
    return false;
  }
  return true;
}
