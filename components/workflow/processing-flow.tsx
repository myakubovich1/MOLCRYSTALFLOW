"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, LoaderCircle } from "lucide-react";

import { Panel } from "@/components/ui/panel";
import { workflowSteps } from "@/lib/demo-data";
import type { JobResult } from "@/lib/types";
import { cn } from "@/lib/utils";

interface ProcessingFlowProps {
  job: JobResult;
}

export function ProcessingFlow({ job }: ProcessingFlowProps) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(-1);

  const completionPercentage = useMemo(() => ((activeIndex + 1) / workflowSteps.length) * 100, [activeIndex]);

  useEffect(() => {
    const timeouts = workflowSteps.map((_, index) =>
      window.setTimeout(() => {
        setActiveIndex(index);
      }, 700 + index * 1150),
    );

    const redirectTimeout = window.setTimeout(() => {
      startTransition(() => {
        router.push(`/results/${job.id}`);
      });
    }, 700 + workflowSteps.length * 1150 + 900);

    return () => {
      timeouts.forEach((timeout) => window.clearTimeout(timeout));
      window.clearTimeout(redirectTimeout);
    };
  }, [job.id, router]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <Panel className="overflow-hidden p-6 sm:p-8">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100/70">Processing workflow</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Simulating a molecular crystal generation run
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
              The current prototype stages a believable research workflow using mock timing and precomputed outputs. No external compute
              backend is contacted in this version.
            </p>
          </div>
          <div className="hidden rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-right text-sm text-slate-300 sm:block">
            <div className="text-xs uppercase tracking-[0.18em] text-slate-500">Job</div>
            <div className="mt-2 font-medium text-white">{job.id}</div>
          </div>
        </div>

        <div className="mb-8 overflow-hidden rounded-full border border-white/8 bg-white/[0.03]">
          <div
            className="h-2 rounded-full bg-[linear-gradient(90deg,rgba(34,211,238,0.7),rgba(129,140,248,0.8))] transition-[width] duration-700 ease-out"
            style={{ width: `${Math.max(completionPercentage, 6)}%` }}
          />
        </div>

        <div className="space-y-4">
          {workflowSteps.map((step, index) => {
            const isCompleted = index < activeIndex;
            const isActive = index === activeIndex;
            const isPending = index > activeIndex;

            return (
              <div
                key={step.id}
                className={cn(
                  "rounded-[24px] border px-5 py-5 transition duration-500",
                  isCompleted && "border-emerald-400/25 bg-emerald-400/8 shadow-[0_0_40px_rgba(16,185,129,0.08)]",
                  isActive && "border-cyan-300/35 bg-cyan-300/8 shadow-[0_0_40px_rgba(34,211,238,0.08)]",
                  isPending && "border-white/8 bg-white/[0.02]",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                      isCompleted && "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
                      isActive && "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
                      isPending && "border-white/10 bg-white/[0.03] text-slate-400",
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : isActive ? (
                      <LoaderCircle className="h-5 w-5 animate-spin" />
                    ) : (
                      <span className="text-sm font-semibold">{index + 1}</span>
                    )}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="text-lg font-medium text-white">{step.title}</h2>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.2em]",
                          isCompleted && "bg-emerald-400/10 text-emerald-100",
                          isActive && "bg-cyan-300/10 text-cyan-100",
                          isPending && "bg-white/[0.04] text-slate-400",
                        )}
                      >
                        {isCompleted ? "Complete" : isActive ? "Running" : "Queued"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{step.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 inline-flex items-center gap-2 text-sm text-slate-400">
          Redirecting to results when artifacts are ready
          <ArrowRight className="h-4 w-4 text-slate-500" />
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel className="p-6">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Input snapshot</p>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-sm text-slate-400">Filename</dt>
              <dd className="mt-1 text-base font-medium text-white">{job.originalFilename}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm text-slate-400">Formula</dt>
                <dd className="mt-1 text-base font-medium text-white">{job.formula}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-400">Atoms</dt>
                <dd className="mt-1 text-base font-medium text-white">{job.atomCount}</dd>
              </div>
            </div>
          </dl>
        </Panel>

        <Panel className="p-6">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Research preview</p>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            The workflow is intentionally staged for product review. Future versions can replace this timing layer with real status polling from a lab
            machine or HPC job queue without changing the overall UX structure.
          </p>
        </Panel>
      </div>
    </div>
  );
}
