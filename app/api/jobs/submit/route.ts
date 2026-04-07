import { getDesktopBackendConfig } from "@/lib/server/desktop-backend-config";

export const runtime = "nodejs";

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
