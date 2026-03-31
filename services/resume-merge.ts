import { generateId } from "@/lib/utils";
import { allowHeuristicFallback } from "@/lib/env";
import type { StructuredResume, WorkExperience } from "@/types/resume";
import { completeJson } from "./ai/client";
import { MERGE_SYSTEM, mergeUserPrompt } from "./ai/prompts";

function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function bulletDedupe(bullets: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const b of bullets) {
    const k = norm(b).slice(0, 200);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(b.trim());
  }
  return out;
}

function mergeExperienceEntries(a: WorkExperience, b: WorkExperience): WorkExperience {
  const sameCompany = norm(a.company) === norm(b.company);
  const sameTitle = norm(a.title) === norm(b.title);
  if (!sameCompany || !sameTitle) {
    return a;
  }
  return {
    ...a,
    bullets: bulletDedupe([...a.bullets, ...b.bullets]),
    summary: a.summary || b.summary,
    startDate: a.startDate || b.startDate,
    endDate: a.endDate || b.endDate,
    current: a.current ?? b.current,
  };
}

/** Deterministic merge without LLM. */
export function mergeResumesDeterministic(resumes: StructuredResume[]): StructuredResume {
  if (resumes.length === 0) {
    return emptyResume();
  }
  if (resumes.length === 1) {
    return resumes[0];
  }

  const name = resumes
    .map((r) => r.header.fullName)
    .sort((a, b) => b.length - a.length)[0];

  const contact = resumes.reduce(
    (acc, r) => ({
      ...acc,
      ...r.header.contact,
    }),
    {} as StructuredResume["header"]["contact"]
  );

  const skills = bulletDedupe(resumes.flatMap((r) => r.skills));

  let experience: WorkExperience[] = [];
  for (const r of resumes) {
    for (const ex of r.experience) {
      const idx = experience.findIndex(
        (e) => norm(e.company) === norm(ex.company) && norm(e.title) === norm(ex.title)
      );
      if (idx >= 0) {
        experience[idx] = mergeExperienceEntries(experience[idx], ex);
      } else {
        experience.push({ ...ex, id: ex.id || generateId("exp") });
      }
    }
  }

  let education = resumes.flatMap((r) => r.education);
  const eduKey = (e: (typeof education)[0]) =>
    `${norm(e.institution)}|${norm(e.degree ?? "")}|${norm(e.field ?? "")}`;
  const eduMap = new Map<string, (typeof education)[0]>();
  for (const e of education) {
    const k = eduKey(e);
    if (!eduMap.has(k)) eduMap.set(k, { ...e, id: e.id || generateId("edu") });
  }
  education = [...eduMap.values()];

  const certifications = resumes.flatMap((r) => r.certifications);
  const certSeen = new Set<string>();
  const certsOut = certifications.filter((c) => {
    const k = norm(c.name);
    if (certSeen.has(k)) return false;
    certSeen.add(k);
    return true;
  });

  const projects = resumes.flatMap((r) => r.projects);
  const projSeen = new Set<string>();
  const projOut = projects.filter((p) => {
    const k = norm(p.name);
    if (projSeen.has(k)) return false;
    projSeen.add(k);
    return true;
  });

  const keywords = bulletDedupe(resumes.flatMap((r) => r.keywords));
  const summaries = resumes.map((r) => r.summary).filter(Boolean);
  const summary = summaries.sort((a, b) => b.length - a.length)[0] ?? "";

  return {
    header: { fullName: name, contact },
    summary,
    skills,
    experience,
    education,
    certifications: certsOut,
    projects: projOut,
    keywords,
  };
}

function emptyResume(): StructuredResume {
  return {
    header: { fullName: "Candidate", contact: {} },
    summary: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    keywords: [],
  };
}

export async function mergeResumes(resumes: StructuredResume[]): Promise<StructuredResume> {
  if (resumes.length === 0) return emptyResume();
  const { getOpenAI } = await import("./ai/client");
  if (!getOpenAI()) {
    if (!allowHeuristicFallback()) {
      throw new Error(
        "OpenAI is not configured. Set OPENAI_API_KEY (or enable ALLOW_HEURISTIC_FALLBACK=true for basic mode)."
      );
    }
    return mergeResumesDeterministic(resumes);
  }
  try {
    const json = await completeJson({
      system: MERGE_SYSTEM,
      user: mergeUserPrompt(resumes),
    });
    return JSON.parse(json) as StructuredResume;
  } catch (err) {
    if (!allowHeuristicFallback()) {
      const msg = err instanceof Error ? err.message : "Unknown merge error";
      throw new Error(`OpenAI resume merge failed: ${msg}`);
    }
    return mergeResumesDeterministic(resumes);
  }
}
