import { NextResponse } from "next/server";

import { getSeededDemoJob } from "@/lib/demo-data";
import { parseMoleculeSubmissionPayload } from "@/lib/molecular-input";
import { jobCookieOptions, JOB_COOKIE_NAME, mergeStoredJobs, parseJobsCookie, serializeJobsCookie } from "@/lib/mock-session";
import type { SubmissionResponse } from "@/lib/types";
import { submitMoleculeSubmission } from "@/lib/submission";

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
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Submit a JSON molecular payload." }, { status: 400 });
  }

  const parsedPayload = parseMoleculeSubmissionPayload(rawBody);

  if (!parsedPayload.success) {
    return NextResponse.json(
      {
        success: false,
        error: parsedPayload.error,
      },
      { status: 400 },
    );
  }

  const job = await submitMoleculeSubmission(parsedPayload.payload);

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
