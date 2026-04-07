import { Panel } from "@/components/ui/panel";
import type { MoleculePreviewGraph } from "@/lib/types";

interface MoleculePreviewProps {
  graph?: MoleculePreviewGraph | null;
}

export function MoleculePreview({ graph }: MoleculePreviewProps) {
  if (!graph || graph.nodes.length === 0) {
    return (
      <Panel className="p-6 sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Structure viewer</p>
            <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Reserved viewer surface</h2>
          </div>
          <span className="theme-chip rounded-full px-3 py-1 text-xs">Viewer integration pending</span>
        </div>

        <div
          className="relative overflow-hidden rounded-[28px] border border-dashed border-[color:var(--surface-border-strong)] p-6"
          style={{ background: "var(--molecule-surface)" }}
        >
          <div className="theme-subpanel-soft flex min-h-[24rem] items-center justify-center rounded-[24px] p-6 text-center">
            <div className="max-w-md">
              <p className="theme-text-primary text-lg font-medium">Interactive structure inspection is reserved for a later frontend upgrade.</p>
              <p className="theme-text-secondary mt-3 text-sm leading-7">
                The connected desktop backend is already returning XYZ artifact files. This viewer panel is where those structures can later be loaded
                directly in-browser without changing the rest of the generation workflow.
              </p>
            </div>
          </div>
        </div>
      </Panel>
    );
  }

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));

  const sortedEdges = [...graph.edges].sort((left, right) => {
    const leftDepth = ((nodeMap.get(left.source)?.depth ?? 0) + (nodeMap.get(left.target)?.depth ?? 0)) / 2;
    const rightDepth = ((nodeMap.get(right.source)?.depth ?? 0) + (nodeMap.get(right.target)?.depth ?? 0)) / 2;
    return leftDepth - rightDepth;
  });

  const sortedNodes = [...graph.nodes].sort((left, right) => left.depth - right.depth);

  return (
    <Panel className="p-6 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Structure viewer</p>
          <h2 className="theme-text-primary mt-3 text-2xl font-semibold">Preview surface</h2>
        </div>
        <span className="theme-chip rounded-full px-3 py-1 text-xs">Viewer-ready mock surface</span>
      </div>

      <div
        className="relative overflow-hidden rounded-[28px] border border-[color:var(--surface-border)] p-4"
        style={{ background: "var(--molecule-surface)" }}
      >
        <div className="absolute inset-4 rounded-[22px] border border-[color:var(--molecule-frame-border)]" />
        <svg viewBox="0 0 100 100" className="relative z-10 h-[24rem] w-full">
          <defs>
            <radialGradient id="molHalo" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="var(--molecule-halo-color)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#molHalo)" opacity="0.8" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="var(--molecule-grid-line)" strokeWidth="0.25" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="var(--molecule-grid-line)" strokeWidth="0.25" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="var(--molecule-grid-line)" strokeWidth="0.25" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="var(--molecule-grid-line)" strokeWidth="0.25" />

          {sortedEdges.map((edge) => {
            const source = nodeMap.get(edge.source);
            const target = nodeMap.get(edge.target);

            if (!source || !target) {
              return null;
            }

            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="var(--molecule-edge)"
                strokeWidth={0.35 + edge.strength * 0.18}
                strokeLinecap="round"
              />
            );
          })}

          {sortedNodes.map((node, index) => (
            <g key={node.id} className="origin-center">
              <circle cx={node.x} cy={node.y} r={node.radius * 2.2} fill={node.color} opacity="0.08" />
              <circle cx={node.x} cy={node.y} r={node.radius} fill={node.color} opacity="0.9" />
              <circle cx={node.x - node.radius / 3} cy={node.y - node.radius / 3} r={Math.max(0.45, node.radius / 4)} fill="rgba(255,255,255,0.55)" />
              {node.symbol !== "H" ? (
                <text
                  x={node.x}
                  y={node.y + 0.8}
                  textAnchor="middle"
                  fontSize="2.8"
                  fill="var(--molecule-label)"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {node.symbol}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-3">
          <span className="theme-chip-accent rounded-full px-3 py-1 text-xs">Projected from uploaded coordinates</span>
          <span className="theme-chip rounded-full px-3 py-1 text-xs">Can later host interactive 3D inspection</span>
          <span className="theme-chip rounded-full px-3 py-1 text-xs">Visual placeholder, not a final scientific renderer</span>
        </div>
      </div>
    </Panel>
  );
}
