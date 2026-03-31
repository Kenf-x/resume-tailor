"use client";

import type { StructuredResume } from "@/types/resume";

export function ResumePreview({
  resume,
  title,
  showAll = false,
}: {
  resume: StructuredResume | null;
  title: string;
  showAll?: boolean;
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

  const visibleExperience = showAll ? resume.experience : resume.experience.slice(0, 4);

  return (
    <div className="rounded-xl border border-[#b8c7da] bg-white p-6 text-sm leading-relaxed shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2c4f75]">{title}</p>
      <h3
        className="mt-2 text-2xl font-bold uppercase tracking-[0.08em] text-[#183a62] dark:text-zinc-100"
        style={{ fontFamily: '"Century Gothic", "Avenir Next", Avenir, sans-serif' }}
      >
        {resume.header.fullName}
      </h3>
      {contactLine && (
        <p
          className="border-b border-[#d4deea] pb-3 text-xs text-[#4e6175] dark:text-zinc-400"
          style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
        >
          {contactLine}
        </p>
      )}

      <section className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1f4872]">Summary</p>
        <p
          className="mt-1 text-zinc-800 dark:text-zinc-200"
          style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
        >
          {resume.summary}
        </p>
      </section>

      <section className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1f4872]">Skills</p>
        <p
          className="mt-1 text-zinc-800 dark:text-zinc-200"
          style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
        >
          {resume.skills.join(", ")}
        </p>
      </section>

      <section className="mt-4">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#1f4872]">Experience</p>
        <div className="mt-2 space-y-3">
          {visibleExperience.map((ex) => (
            <article key={ex.id}>
              <p
                className="font-semibold text-[#14395f] dark:text-zinc-100"
                style={{ fontFamily: '"Century Gothic", "Avenir Next", Avenir, sans-serif' }}
              >
                {ex.title} - {ex.company}
              </p>
              {(ex.startDate || ex.endDate) && (
                <p
                  className="text-xs text-[#5f7388]"
                  style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
                >
                  {[ex.startDate, ex.endDate].filter(Boolean).join(" - ")}
                </p>
              )}
              <ul
                className="mt-1 list-disc space-y-1 pl-5 text-zinc-800 dark:text-zinc-200"
                style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
              >
                {(showAll ? ex.bullets : ex.bullets.slice(0, 4)).map((b) => (
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
