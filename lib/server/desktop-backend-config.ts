export function getDesktopBackendConfig() {
  const baseUrl = process.env.DESKTOP_BACKEND_URL?.trim().replace(/\/+$/, "");
  const token = process.env.DESKTOP_BACKEND_TOKEN?.trim();

  if (!baseUrl || !token) {
    throw new Error("Missing DESKTOP_BACKEND_URL or DESKTOP_BACKEND_TOKEN.");
  }

  return {
    baseUrl,
    token,
  };
}
