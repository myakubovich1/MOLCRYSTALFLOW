"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { ChevronDown, Cpu, FlaskConical, HardDrive, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { workflowSteps } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

interface ExpandableInfoSectionProps {
  id: string;
  title: string;
  eyebrow: string;
  teaser: string;
  tag: string;
  icon: LucideIcon;
  isOpen: boolean;
  onToggle: (id: string) => void;
  children: ReactNode;
}

interface ExpandableContentProps {
  id: string;
  isOpen: boolean;
  children: ReactNode;
}

function ExpandableContent({ id, isOpen, children }: ExpandableContentProps) {
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const node = contentRef.current;

    if (!node) {
      return;
    }

    const updateHeight = () => {
      setContentHeight(node.scrollHeight);
    };

    updateHeight();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(() => {
      updateHeight();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [children]);

  return (
    <div
      id={id}
      aria-hidden={!isOpen}
      className={cn(
        "overflow-hidden transition-[height] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[height]",
        !isOpen && "pointer-events-none",
      )}
      style={{ height: isOpen ? `${contentHeight}px` : "0px" }}
    >
      <div
        ref={contentRef}
        className={cn(
          "border-t border-white/8 px-5 pb-5 pt-5 transition-[opacity,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-[opacity,transform] sm:px-6 sm:pb-6",
          isOpen ? "translate-y-0 opacity-100 delay-75" : "-translate-y-1.5 opacity-0",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function ExpandableInfoSection({
  id,
  title,
  eyebrow,
  teaser,
  tag,
  icon: Icon,
  isOpen,
  onToggle,
  children,
}: ExpandableInfoSectionProps) {
  const contentId = `${id}-content`;

  return (
    <Panel
      className={cn(
        "overflow-hidden p-0 transition-[border-color,background-color,box-shadow] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        isOpen && "border-cyan-300/18 bg-[linear-gradient(180deg,rgba(34,211,238,0.08),rgba(255,255,255,0.02)),rgba(8,15,24,0.9)]",
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => onToggle(id)}
        className="group w-full px-5 py-5 text-left sm:px-6 sm:py-6"
      >
        <div className="flex items-start gap-4">
          <span
            className={cn(
              "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-slate-100 transition-[border-color,background-color,color,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              isOpen ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-100" : "border-white/10 bg-white/[0.03]",
            )}
          >
            <Icon className="h-5 w-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-slate-500">{eyebrow}</p>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                {tag}
              </span>
            </div>

            <div className="mt-3 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-white sm:text-2xl">{title}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-400 sm:text-[15px]">{teaser}</p>
              </div>

              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20 text-slate-300 transition-[border-color,background-color,color,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                  isOpen && "border-cyan-300/20 bg-cyan-300/10 text-cyan-100",
                )}
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
                    isOpen && "rotate-180",
                  )}
                />
              </span>
            </div>
          </div>
        </div>
      </button>

      <ExpandableContent id={contentId} isOpen={isOpen}>
        {children}
      </ExpandableContent>
    </Panel>
  );
}

export function LandingInfoSections() {
  const [openSection, setOpenSection] = useState<string | null>(null);

  function handleToggle(id: string) {
    setOpenSection((current) => (current === id ? null : id));
  }

  return (
    <section className="mt-10">
      <div className="max-w-4xl">
        <StatusPill>Reviewer context</StatusPill>
        <h2 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Scope, status, and deployment path</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400 sm:text-base">
          This section is intentionally compact by default. Open any panel to review the current demo scope, the product shell being evaluated now,
          and the planned handoff to real molecular crystal generation infrastructure over time.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          {["Mock research preview", "Desktop or lab execution next", "Cluster optional later", "Capacity-aware rollout"].map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-slate-300"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <ExpandableInfoSection
          id="workflow"
          eyebrow="Workflow overview"
          title="Current demo workflow"
          teaser="The prototype already models the full user journey from `.xyz` intake through staged processing to candidate delivery, while keeping the execution layer mocked."
          tag="4 stages"
          icon={Workflow}
          isOpen={openSection === "workflow"}
          onToggle={handleToggle}
        >
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-sm font-semibold text-cyan-100">
                    0{index + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-medium text-white">{step.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-7 text-slate-300">
            The processing page currently uses mock timing and precomputed result packaging. The same stage model can later be driven by real job
            creation, status polling, and artifact retrieval without changing the surrounding interface.
          </div>
        </ExpandableInfoSection>

        <ExpandableInfoSection
          id="framing"
          eyebrow="Product framing"
          title="What this prototype communicates today"
          teaser="The current interface is meant to be credible for reviewers: serious about the research direction, clear about present limitations, and useful for product evaluation now."
          tag="honest scope"
          icon={FlaskConical}
          isOpen={openSection === "framing"}
          onToggle={handleToggle}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <h4 className="text-lg font-semibold text-white">Scientific framing</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                The results view is positioned as a research preview of generated crystal structure candidates. It does not imply final ranking,
                experimental validation, or physically verified output quality.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <h4 className="text-lg font-semibold text-white">Workflow shell</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                The demo is validating upload ergonomics, progress communication, result presentation, and overall product tone before the scientific
                execution layer is introduced.
              </p>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5 md:col-span-2 xl:col-span-1">
              <h4 className="text-lg font-semibold text-white">Extensible foundation</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Routes, status models, and result types are already shaped to support a future backend swap, so the UI can mature now without forcing a
                full redesign later.
              </p>
            </div>
          </div>
        </ExpandableInfoSection>

        <ExpandableInfoSection
          id="roadmap"
          eyebrow="Project status"
          title="Project status & deployment roadmap"
          teaser="Today this is a mock-first research interface. The next phase is real execution on a desktop or lab machine, with cluster-style scaling considered later if it becomes useful."
          tag="deployment plan"
          icon={Cpu}
          isOpen={openSection === "roadmap"}
          onToggle={handleToggle}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">Current mode</p>
              <h4 className="mt-3 text-lg font-semibold text-white">Mock research preview</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Today&apos;s site demonstrates the upload flow, staged workflow, and candidate result presentation using internal mock routes and
                precomputed outputs.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">Next phase</p>
              <h4 className="mt-3 text-lg font-semibold text-white">Desktop or lab execution</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                The expected first real backend step is to connect this interface to a local research workstation or laboratory computer that can run
                generation jobs directly.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">Possible later scaling</p>
              <h4 className="mt-3 text-lg font-semibold text-white">Cluster-style compute when appropriate</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                If the workflow and research usage justify it, the execution layer can later be adapted for cluster or HPC-style scheduling rather than
                being limited to a single machine.
              </p>
            </div>

            <div className="rounded-[22px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-100/70">Expected operating limits</p>
              <h4 className="mt-3 text-lg font-semibold text-white">User generation may be capacity-bound</h4>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                Future users should be able to submit conformers and retrieve candidate structures themselves, but availability may depend on compute
                capacity, queue time, and resource scheduling rather than unrestricted throughput.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-4 rounded-[24px] border border-white/10 bg-white/[0.03] px-4 py-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-100">
              <HardDrive className="h-5 w-5" />
            </span>
            <p className="text-sm leading-7 text-slate-300">
              The interface is being shaped now so a real execution backend can be introduced later without redesigning the entire product shell. That
              includes the upload contract, status language, result packaging, and the reviewer-facing framing around what the system does and does not
              claim.
            </p>
          </div>
        </ExpandableInfoSection>
      </div>
    </section>
  );
}
