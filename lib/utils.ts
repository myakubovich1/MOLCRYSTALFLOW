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
      return "from-violet-500/18 via-violet-400/8 to-transparent";
    case "emerald":
      return "from-emerald-500/18 via-emerald-400/8 to-transparent";
    case "amber":
      return "from-amber-400/18 via-amber-300/8 to-transparent";
    case "cyan":
    default:
      return "from-cyan-500/18 via-cyan-400/8 to-transparent";
  }
}
