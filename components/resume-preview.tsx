"use client";

import type { StructuredResume } from "@/types/resume";

export function ResumePreview({
  resume,
  title,
}: {
  resume: StructuredResume | null;
  title: string;
}) {
  if (!resume) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900">
        {title}: no data yet.
      </div>
    );
  }

  const c = resume.header.contact;
  const contactLine = [c.email, c.phone, c.location, c.linkedin, c.website]
    .filter(Boolean)
    .join(" | ");

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{title}</p>
      <h3 className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-100">
        {resume.header.fullName}
      </h3>
      {contactLine && <p className="text-xs text-zinc-600 dark:text-zinc-400">{contactLine}</p>}

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Summary</p>
        <p className="mt-1 text-zinc-800 dark:text-zinc-200">{resume.summary}</p>
      </section>

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Skills</p>
        <p className="mt-1 text-zinc-800 dark:text-zinc-200">{resume.skills.join(", ")}</p>
      </section>

      <section className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Experience</p>
        <div className="mt-2 space-y-3">
          {resume.experience.slice(0, 4).map((ex) => (
            <article key={ex.id}>
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                {ex.title} - {ex.company}
              </p>
              {(ex.startDate || ex.endDate) && (
                <p className="text-xs text-zinc-500">
                  {[ex.startDate, ex.endDate].filter(Boolean).join(" - ")}
                </p>
              )}
              <ul className="mt-1 list-disc space-y-1 pl-5 text-zinc-800 dark:text-zinc-200">
                {ex.bullets.slice(0, 4).map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
