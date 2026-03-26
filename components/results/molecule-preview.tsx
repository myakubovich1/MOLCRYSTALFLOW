import { Panel } from "@/components/ui/panel";
import type { MoleculePreviewGraph } from "@/lib/types";

interface MoleculePreviewProps {
  graph: MoleculePreviewGraph;
}

export function MoleculePreview({ graph }: MoleculePreviewProps) {
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
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100/70">Molecule preview</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Conformer geometry signal</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
          Coordinate-derived mock visualization
        </span>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.08),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-4">
        <div className="absolute inset-4 rounded-[22px] border border-white/6" />
        <svg viewBox="0 0 100 100" className="relative z-10 h-[24rem] w-full">
          <defs>
            <radialGradient id="molHalo" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(34,211,238,0.22)" />
              <stop offset="100%" stopColor="rgba(34,211,238,0)" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="100" fill="url(#molHalo)" opacity="0.8" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="rgba(148,163,184,0.08)" strokeWidth="0.25" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="rgba(148,163,184,0.06)" strokeWidth="0.25" />
          <line x1="10" y1="50" x2="90" y2="50" stroke="rgba(148,163,184,0.05)" strokeWidth="0.25" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(148,163,184,0.05)" strokeWidth="0.25" />

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
                stroke="rgba(148, 244, 255, 0.4)"
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
                  fill="rgba(7,17,25,0.88)"
                  style={{ animationDelay: `${index * 120}ms` }}
                >
                  {node.symbol}
                </text>
              ) : null}
            </g>
          ))}
        </svg>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-cyan-300/15 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
            Projected from uploaded coordinates
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-slate-300">
            Visual metaphor for demo review, not a final scientific renderer
          </span>
        </div>
      </div>
    </Panel>
  );
}
