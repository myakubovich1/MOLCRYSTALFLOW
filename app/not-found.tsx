import Link from "next/link";

import { AppFrame } from "@/components/ui/app-frame";
import { Panel } from "@/components/ui/panel";

export default function NotFound() {
  return (
    <AppFrame>
      <div className="mx-auto max-w-2xl">
        <Panel className="p-8 text-center sm:p-12">
          <p className="theme-text-muted text-xs font-medium uppercase tracking-[0.24em]">Result unavailable</p>
          <h1 className="theme-text-primary mt-4 text-3xl font-semibold">This demo job could not be found.</h1>
          <p className="theme-text-secondary mt-4 text-sm leading-7 sm:text-base">
            The requested result id is unavailable. Submit a new `.xyz` conformer to continue using the generator workflow.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="theme-button-outline inline-flex items-center rounded-full px-5 py-3 text-sm font-medium"
            >
              Return to Generate
            </Link>
          </div>
        </Panel>
      </div>
    </AppFrame>
  );
}
