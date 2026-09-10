import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "Resume — Jon Cheng",
};

export default function ResumePage() {
  return (
    <PageShell>
      <h1>Resume</h1>
      <p>
        Stand-in for now. The actual plan (see the project doc&rsquo;s
        &ldquo;Decision: resume delivery&rdquo; section) is for this page to
        automatically pull the latest compiled PDF from a private LaTeX
        repo, so the resume never goes stale without a redeploy — not built
        yet, so this is just a placeholder destination for the nav link in
        the meantime.
      </p>
    </PageShell>
  );
}
