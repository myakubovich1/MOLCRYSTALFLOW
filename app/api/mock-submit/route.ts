import { NextResponse } from "next/server";

import { createJobResult, getSeededDemoJob } from "@/lib/demo-data";
import { jobCookieOptions, JOB_COOKIE_NAME, mergeStoredJobs, parseJobsCookie, serializeJobsCookie } from "@/lib/mock-session";
import type { SubmissionResponse } from "@/lib/types";
import { parseXyzFile } from "@/lib/xyz";

export const runtime = "nodejs";

function getCookieValue(request: Request, name: string) {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";").map((entry) => entry.trim());
  const matchedCookie = cookies.find((entry) => entry.startsWith(`${name}=`));
  return matchedCookie?.slice(name.length + 1);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: "Upload exactly one `.xyz` file." }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".xyz")) {
    return NextResponse.json({ success: false, error: "The demo currently accepts only `.xyz` molecular conformer input." }, { status: 400 });
  }

  if (file.size === 0 || file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ success: false, error: "Keep the uploaded `.xyz` file between 1 byte and 5 MB." }, { status: 400 });
  }

  const contents = await file.text();
  const parsed = parseXyzFile(contents);

  if (!parsed.isValid || parsed.atomCount === 0) {
    return NextResponse.json(
      {
        success: false,
        error: "The uploaded file could not be parsed as a valid `.xyz` molecular conformer.",
      },
      { status: 400 },
    );
  }

  // Future real backend integration point:
  // replace mock job creation with upload + remote submission to a lab machine or HPC entrypoint.
  const job = createJobResult({
    id: `mcf_${crypto.randomUUID().slice(0, 8)}`,
    originalFilename: file.name,
    parsed,
  });

  const existingJobs = parseJobsCookie(getCookieValue(request, JOB_COOKIE_NAME));
  const serializedJobs = serializeJobsCookie(mergeStoredJobs(existingJobs, job));

  const response = NextResponse.json<SubmissionResponse>({
    success: true,
    job,
    nextUrl: `/processing?job=${job.id}`,
  });

  response.cookies.set(JOB_COOKIE_NAME, serializedJobs, jobCookieOptions);

  return response;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ success: false, error: "Missing job id." }, { status: 400 });
  }

  const job = parseJobsCookie(getCookieValue(request, JOB_COOKIE_NAME))[id] ?? getSeededDemoJob(id);

  if (!job) {
    return NextResponse.json({ success: false, error: "Job not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, job });
}
