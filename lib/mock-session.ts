import { cookies } from "next/headers";

import type { JobResult } from "@/lib/types";

export const JOB_COOKIE_NAME = "molcrystalflow_demo_jobs";

export const jobCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 12,
};

type JobMap = Record<string, JobResult>;

export function parseJobsCookie(rawValue?: string) {
  if (!rawValue) {
    return {} as JobMap;
  }

  try {
    const decoded = Buffer.from(rawValue, "base64url").toString("utf8");
    return JSON.parse(decoded) as JobMap;
  } catch {
    return {} as JobMap;
  }
}

export function serializeJobsCookie(jobMap: JobMap) {
  return Buffer.from(JSON.stringify(jobMap), "utf8").toString("base64url");
}

export function mergeStoredJobs(existingJobs: JobMap, job: JobResult) {
  const merged = { ...existingJobs, [job.id]: job };

  const retainedJobs = Object.values(merged)
    .sort((left, right) => Date.parse(right.receivedAt) - Date.parse(left.receivedAt))
    .slice(0, 4);

  return Object.fromEntries(retainedJobs.map((entry) => [entry.id, entry]));
}

export async function getStoredJob(id: string) {
  const cookieStore = await cookies();
  const jobMap = parseJobsCookie(cookieStore.get(JOB_COOKIE_NAME)?.value);
  return jobMap[id] ?? null;
}
