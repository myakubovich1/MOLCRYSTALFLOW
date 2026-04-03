export const runtime = "nodejs";

function getDesktopBackendConfig() {
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

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const config = getDesktopBackendConfig();
    const res = await fetch(`${config.baseUrl}/jobs/${id}`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await res.json()
      : { error: await res.text() };

    if (!res.ok) {
      return Response.json(
        { error: data.detail || data.error || "Status lookup failed" },
        { status: res.status },
      );
    }

    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown status error" },
      { status: 500 },
    );
  }
}
