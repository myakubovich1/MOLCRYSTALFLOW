export function getDesktopBackendConfig() {
  const baseUrl = process.env.DESKTOP_BACKEND_URL;
  const token = process.env.DESKTOP_BACKEND_TOKEN;

  if (!baseUrl || !token) {
    throw new Error("Missing DESKTOP_BACKEND_URL or DESKTOP_BACKEND_TOKEN.");
  }

  return {
    baseUrl,
    token,
  };
}
