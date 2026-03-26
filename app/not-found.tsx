import Link from "next/link";

import { AppFrame } from "@/components/ui/app-frame";
import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <AppFrame>
      <div className="mx-auto max-w-2xl">
        <Panel className="p-8 text-center sm:p-12">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Result unavailable</p>
          <h1 className="mt-4 text-3xl font-semibold text-white">This demo job could not be found.</h1>
          <p className="mt-4 text-sm leading-7 text-slate-400 sm:text-base">
            The mock session state may have expired. Submit a new `.xyz` conformer or open the seeded sample result to continue reviewing the product
            flow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white hover:border-white/20 hover:bg-white/[0.07]"
            >
              Return home
            </Link>
            <Link
              href="/results/demo-sample"
              className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-5 py-3 text-sm font-medium text-cyan-100 hover:border-cyan-300/35 hover:bg-cyan-300/14"
            >
              Open sample result
            </Link>
          </div>
        </Panel>
      </div>
    </AppFrame>
  );
}
