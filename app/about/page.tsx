import type { Metadata } from "next";

import { AboutPageSections } from "@/components/about/about-page-sections";
import { AppFrame } from "@/components/ui/app-frame";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <AppFrame wide>
      <AboutPageSections />
    </AppFrame>
  );
}
