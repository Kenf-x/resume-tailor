import type {
  JobPostingStructured,
  KeywordMatchAnalysisData,
  StructuredResume,
  TailoringIntensity,
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

function heuristicMatchAnalysis(options: {
  tailored: StructuredResume;
  job: JobPostingStructured;
}): KeywordMatchAnalysisData {
  const jobKw = new Set(options.job.keywords.map((k) => k.toLowerCase()));
  const resumeText = JSON.stringify(options.tailored).toLowerCase();
  const matched = options.job.keywords.filter((k) => resumeText.includes(k.toLowerCase()));
  const missing = options.job.keywords.filter((k) => !resumeText.includes(k.toLowerCase()));
  const score = jobKw.size ? Math.round((matched.length / jobKw.size) * 100) : 50;
  return {
    matchedKeywords: matched,
    missingKeywords: missing.slice(0, 30),
    suggestions: [
      "Configure OPENAI_API_KEY for deeper match analysis and tailoring.",
    ],
    matchScore: Math.min(100, Math.max(0, score)),
  };
}

export async function tailorResume(options: {
  master: StructuredResume;
  job: JobPostingStructured;
  intensity: TailoringIntensity;
}): Promise<StructuredResume> {
  const { getOpenAI } = await import("./ai/client");
  if (!getOpenAI()) {
    return options.master;
  }
  try {
    const json = await completeJson({
      system: TAILOR_SYSTEM,
      user: tailorUserPrompt(
        options.master,
        options.job,
        intensityMap[options.intensity]
      ),
    });
    return JSON.parse(json) as StructuredResume;
  } catch {
    return options.master;
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
