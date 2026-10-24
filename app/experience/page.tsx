// /experience — resume, generated from resume.tex on GitHub (lib/resume). No resume text lives in this repo.
// Fits: resume-experience.tsx (interactive canvas ↔ plain page). Everything generated from the data.
// Dev: fetch/parse errors render on the page. Production: they fail the build (never ship a broken resume).

import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { getResume, type Resume } from "@/lib/resume";
import { ResumeExperience } from "./resume-experience";
import { sceneSections } from "./scene-model";

export const metadata: Metadata = {
  title: "Resume — Jon Cheng",
};

export default async function ResumePage() {
  let resume: Resume;
  try {
    resume = await getResume();
  } catch (e) {
    if (process.env.NODE_ENV === "production") throw e;
    return (
      <PageShell>
        <h1>Resume</h1>
        <pre className="resume-error">{(e as Error).message}</pre>
      </PageShell>
    );
  }
  return <ResumeExperience resume={resume} sections={sceneSections(resume)} />;
}
