import type { CandidatePreview } from "@/lib/types";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatZValues(values: number[]) {
  return values.map((value) => `Z = ${value}`).join(", ");
}

export function accentClassName(accent: CandidatePreview["accent"]) {
  switch (accent) {
    case "violet":
      return "from-violet-400/20 via-violet-400/8 to-transparent text-violet-100 ring-violet-400/30";
    case "emerald":
      return "from-emerald-400/20 via-emerald-400/8 to-transparent text-emerald-100 ring-emerald-400/30";
    case "amber":
      return "from-amber-300/20 via-amber-300/8 to-transparent text-amber-100 ring-amber-300/30";
    case "cyan":
    default:
      return "from-cyan-300/20 via-cyan-300/8 to-transparent text-cyan-100 ring-cyan-300/30";
  }
}
