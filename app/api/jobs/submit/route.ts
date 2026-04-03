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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const config = getDesktopBackendConfig();

    const res = await fetch(`${config.baseUrl}/jobs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data.detail || data.error || "Desktop backend error" },
        { status: res.status },
      );
    }

    return Response.json(data);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Unknown submit error" },
      { status: 500 },
    );
  }
}
