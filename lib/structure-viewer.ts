import type { ResultFile, ViewerSource } from "@/lib/types";

export function extractZValueFromArtifactName(name: string) {
  const match = name.match(/^crystals_z(\d+)\.xyz$/i);

  if (!match) {
    return null;
  }

  const zValue = Number(match[1]);
  return Number.isFinite(zValue) ? zValue : null;
}

export function buildViewerSourcesFromArtifacts(files: ResultFile[]): ViewerSource[] {
  const sources = files.reduce<ViewerSource[]>((accumulator, file) => {
      const zValue = extractZValueFromArtifactName(file.name);

      if (zValue === null) {
        return accumulator;
      }

      accumulator.push({
        artifactName: file.name,
        label: `Z = ${zValue}`,
        zValue,
        rawText: "",
        structures: [],
      });

      return accumulator;
    }, []);

  return sources.sort((left, right) => left.zValue - right.zValue);
}
