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
            <p className="theme-text-accent text-xs font-medium uppercase tracking-[0.24em]">Processing workflow</p>
            <h1 className="theme-text-primary mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Simulating a molecular crystal generation run
            </h1>
            <p className="theme-text-secondary mt-4 max-w-2xl text-sm leading-7 sm:text-base">
              The current prototype stages a believable research workflow using mock timing and precomputed outputs. No external compute
              backend is contacted in this version.
            </p>
          </div>
          <div className="theme-subpanel-soft theme-text-secondary hidden rounded-2xl px-4 py-3 text-right text-sm sm:block">
            <div className="theme-text-muted text-xs uppercase tracking-[0.18em]">Job</div>
            <div className="theme-text-primary mt-2 font-medium">{job.id}</div>
          </div>
        </div>

        <div className="theme-progress-track mb-8 overflow-hidden rounded-full">
          <div
            className="theme-progress-bar h-2 rounded-full transition-[width] duration-700 ease-out"
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
                  isCompleted && "theme-state-success shadow-[0_0_40px_rgba(16,185,129,0.08)]",
                  isActive && "theme-state-active shadow-[0_0_40px_var(--accent-shadow)]",
                  isPending && "theme-state-pending",
                )}
              >
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
                      isCompleted && "theme-state-success theme-state-success-text",
                      isActive && "theme-state-active theme-state-active-text",
                      isPending && "theme-state-pending theme-state-pending-text",
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
                      <h2 className="theme-text-primary text-lg font-medium">{step.title}</h2>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.2em]",
                          isCompleted && "theme-state-success theme-state-success-text",
                          isActive && "theme-state-active theme-state-active-text",
                          isPending && "theme-state-pending theme-state-pending-text",
                        )}
                      >
                        {isCompleted ? "Complete" : isActive ? "Running" : "Queued"}
                      </span>
                    </div>
                    <p className="theme-text-secondary mt-2 text-sm leading-6">{step.detail}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="theme-text-secondary mt-8 inline-flex items-center gap-2 text-sm">
          Redirecting to results when artifacts are ready
          <ArrowRight className="theme-text-muted h-4 w-4" />
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel className="p-6">
          <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Input snapshot</p>
          <dl className="mt-5 space-y-4">
            <div>
              <dt className="theme-text-secondary text-sm">Filename</dt>
              <dd className="theme-text-primary mt-1 text-base font-medium">{job.originalFilename}</dd>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="theme-text-secondary text-sm">Formula</dt>
                <dd className="theme-text-primary mt-1 text-base font-medium">{job.formula}</dd>
              </div>
              <div>
                <dt className="theme-text-secondary text-sm">Atoms</dt>
                <dd className="theme-text-primary mt-1 text-base font-medium">{job.atomCount}</dd>
              </div>
            </div>
          </dl>
        </Panel>

        <Panel className="p-6">
          <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Research preview</p>
          <p className="theme-text-secondary mt-4 text-sm leading-7">
            The workflow is intentionally staged for product review. Future versions can replace this timing layer with real status polling from a lab
            machine or HPC job queue without changing the overall UX structure.
          </p>
        </Panel>
      </div>
    </div>
  );
}
