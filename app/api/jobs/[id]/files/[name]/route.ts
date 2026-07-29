import { getDesktopBackendConfig } from "@/lib/server/desktop-backend-config";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string; name: string }> },
) {
  const { id, name } = await context.params;

  try {
    const config = getDesktopBackendConfig();
    const res = await fetch(
      `${config.baseUrl}/jobs/${id}/files/${encodeURIComponent(name)}`,
      {
        headers: {
          Authorization: `Bearer ${config.token}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      const text = await res.text();
      return new Response(text, { status: res.status });
    }

    const blob = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const disposition = name.toLowerCase().endsWith(".zip") ? "attachment" : "inline";

    return new Response(blob, {
      headers: {
        "content-type": contentType,
        "content-disposition": `${disposition}; filename="${name}"`,
      },
    });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Unknown file proxy error",
      { status: 500 },
    );
  }
}
