import { getDesktopBackendConfig } from "@/lib/server/desktop-backend-config";

export const runtime = "nodejs";

export async function GET() {
  try {
    const config = getDesktopBackendConfig();
    const res = await fetch(`${config.baseUrl}/health`, {
      headers: {
        Authorization: `Bearer ${config.token}`,
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : { detail: await res.text() };

    if (!res.ok) {
      return Response.json(
        {
          ok: false,
          error:
            (typeof payload?.detail === "string" && payload.detail) ||
            (typeof payload?.error === "string" && payload.error) ||
            "Desktop backend health check failed.",
        },
        { status: res.status },
      );
    }

    return Response.json({
      ok: true,
      detail:
        (typeof payload?.detail === "string" && payload.detail) ||
        (typeof payload?.status === "string" && payload.status) ||
        "Desktop backend reachable.",
      capabilities:
        typeof payload?.capabilities === "object" && payload.capabilities !== null
          ? payload.capabilities
          : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown desktop backend health error.",
      },
      { status: 500 },
    );
  }
}
