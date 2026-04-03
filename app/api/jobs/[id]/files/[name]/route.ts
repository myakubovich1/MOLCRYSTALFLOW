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

    return new Response(blob, {
      headers: {
        "content-type": contentType,
        "content-disposition": `inline; filename="${name}"`,
      },
    });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Unknown file proxy error",
      { status: 500 },
    );
  }
}
