import type {
  JobPostingStructured,
  KeywordMatchAnalysisData,
  StructuredResume,
  TailorOutputMode,
  TailoringIntensity,
  WorkExperience,
} from "@/types/resume";
import { completeJson } from "./ai/client";
import {
  MATCH_SYSTEM,
  TAILOR_SYSTEM,
  matchAnalysisUserPrompt,
  tailorUserPrompt,
} from "./ai/prompts";

const intensityMap: Record<TailoringIntensity, "LIGHT" | "MODERATE" | "AGGRESSIVE"> = {
  LIGHT: "LIGHT",
  MODERATE: "MODERATE",
  AGGRESSIVE: "AGGRESSIVE",
};

function normalizeWord(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9+#./ -]/g, " ").replace(/\s+/g, " ").trim();
}

function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)];
}

function keywordUniverse(job: JobPostingStructured): string[] {
  const combined = [
    ...job.keywords,
    ...job.skills,
    ...job.requiredQualifications,
    ...job.preferredQualifications,
    ...job.responsibilities,
  ]
    .flatMap((x) => x.split(/[,;|/]/))
    .map((s) => normalizeWord(s))
    .filter((s) => s.length >= 3);
  return unique(combined).slice(0, 80);
}

function relevanceScore(text: string, keywords: string[]): number {
  const norm = normalizeWord(text);
  let score = 0;
  for (const kw of keywords) {
    if (kw && norm.includes(kw)) score += kw.length > 10 ? 2 : 1;
  }
  return score;
}

function sortExperienceByRelevance(
  experience: WorkExperience[],
  keywords: string[]
): WorkExperience[] {
  return [...experience].sort((a, b) => {
    const aText = `${a.title} ${a.company} ${a.summary ?? ""} ${a.bullets.join(" ")}`;
    const bText = `${b.title} ${b.company} ${b.summary ?? ""} ${b.bullets.join(" ")}`;
    return relevanceScore(bText, keywords) - relevanceScore(aText, keywords);
  });
}

function tightenBullet(b: string): string {
  return b.replace(/^\s*[•*-]\s*/, "").replace(/\s+/g, " ").trim();
}

function heuristicallyTailor(options: {
  master: StructuredResume;
  job: JobPostingStructured;
  intensity: TailoringIntensity;
  outputMode?: TailorOutputMode;
}): StructuredResume {
  const kws = keywordUniverse(options.job);
  const master = options.master;
  const sourceText = normalizeWord(JSON.stringify(master));
  const matchedKws = kws.filter((k) => sourceText.includes(k)).slice(0, 12);
  const isFullOutput = options.outputMode === "FULL";
  const bulletLimit =
    options.intensity === "LIGHT" ? 8 : options.intensity === "MODERATE" ? 6 : 4;

  const experience = sortExperienceByRelevance(master.experience, kws).map((ex) => {
    const sortedBullets = [...ex.bullets]
      .map(tightenBullet)
      .sort((a, b) => relevanceScore(b, kws) - relevanceScore(a, kws));
    return {
      ...ex,
      bullets:
        isFullOutput || options.intensity === "LIGHT"
          ? sortedBullets
          : sortedBullets.slice(0, Math.min(sortedBullets.length, bulletLimit)),
    };
  });

  const sortedSkills = [...master.skills].sort(
    (a, b) => relevanceScore(b, kws) - relevanceScore(a, kws)
  );
  const skills =
    isFullOutput || options.intensity === "LIGHT"
      ? sortedSkills
      : sortedSkills.slice(0, Math.min(sortedSkills.length, 18));

  const topExperience = experience[0];
  const summarySeed = master.summary?.trim() || "";
  const summaryParts = [
    summarySeed,
    matchedKws.length ? `Targeted strengths: ${matchedKws.slice(0, 6).join(", ")}.` : "",
    topExperience ? `Most relevant role: ${topExperience.title} at ${topExperience.company}.` : "",
  ].filter(Boolean);

  return {
    ...master,
    summary: summaryParts.join(" ").slice(0, 600),
    skills,
    experience,
    keywords: unique([...master.keywords, ...matchedKws]).slice(0, 40),
  };
}

function heuristicMatchAnalysis(options: {
  tailored: StructuredResume;
  job: JobPostingStructured;
}): KeywordMatchAnalysisData {
  const allJobTerms = keywordUniverse(options.job);
  const jobKw = new Set(allJobTerms);
  const resumeText = normalizeWord(JSON.stringify(options.tailored));
  const matched = allJobTerms.filter((k) => resumeText.includes(k));
  const missing = allJobTerms.filter((k) => !resumeText.includes(k));
  const score = jobKw.size ? Math.round((matched.length / jobKw.size) * 100) : 50;
  return {
    matchedKeywords: matched.slice(0, 30),
    missingKeywords: missing.slice(0, 30),
    suggestions: [
      "Move high-relevance bullets to the top of the first two roles.",
      "Use action + impact bullets (verb + result + metric when available).",
      "Mirror job terminology only where it reflects real experience.",
    ],
    matchScore: Math.min(100, Math.max(0, score)),
  };
}

export async function tailorResume(options: {
  master: StructuredResume;
  job: JobPostingStructured;
  intensity: TailoringIntensity;
  outputMode?: TailorOutputMode;
}): Promise<StructuredResume> {
  const { getOpenAI } = await import("./ai/client");
  if (!getOpenAI()) {
    return heuristicallyTailor(options);
  }
  try {
    const json = await completeJson({
      system: TAILOR_SYSTEM,
      user: tailorUserPrompt(
        options.master,
        options.job,
        intensityMap[options.intensity],
        options.outputMode ?? "CONCISE"
      ),
    });
    return JSON.parse(json) as StructuredResume;
  } catch {
    return heuristicallyTailor(options);
  }
}

export async function analyzeMatch(options: {
  tailored: StructuredResume;
  job: JobPostingStructured;
}): Promise<KeywordMatchAnalysisData> {
  const { getOpenAI } = await import("./ai/client");
  if (!getOpenAI()) {
    return heuristicMatchAnalysis(options);
  }
  try {
    const json = await completeJson({
      system: MATCH_SYSTEM,
      user: matchAnalysisUserPrompt(options.tailored, options.job),
    });
    const data = JSON.parse(json) as KeywordMatchAnalysisData;
    return {
      matchedKeywords: data.matchedKeywords ?? [],
      missingKeywords: data.missingKeywords ?? [],
      suggestions: data.suggestions ?? [],
      matchScore: Number.isFinite(data.matchScore) ? data.matchScore : 0,
    };
  } catch {
    return heuristicMatchAnalysis(options);
  }
}
