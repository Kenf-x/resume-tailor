import { load } from "cheerio";
import type { JobPostingStructured } from "@/types/resume";
import { completeJson } from "./ai/client";
import { JOB_ANALYSIS_SYSTEM, jobAnalysisUserPrompt } from "./ai/prompts";

export type JobPlatform = "linkedin" | "indeed" | "ziprecruiter" | "paste" | "unknown";

export function detectPlatform(url: string): JobPlatform {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    if (h.includes("linkedin.com")) return "linkedin";
    if (h.includes("indeed.com")) return "indeed";
    if (h.includes("ziprecruiter.com")) return "ziprecruiter";
  } catch {
    /* ignore */
  }
  return "unknown";
}

function stripNoise(html: string): string {
  const $ = load(html);
  $("script, style, nav, footer, iframe, noscript").remove();
  const text = $("body").text() || $.root().text();
  return text.replace(/\s+/g, " ").trim();
}

export async function fetchJobPageText(url: string): Promise<{ text: string; blocked?: boolean }> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ResumeTailorBot/1.0; +https://example.com) AppleWebKit/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });
    if (!res.ok) {
      return { text: "", blocked: true };
    }
    const html = await res.text();
    const text = stripNoise(html);
    if (text.length < 200) {
      return { text: "", blocked: true };
    }
    return { text: text.slice(0, 100000) };
  } catch {
    return { text: "", blocked: true };
  }
}

function heuristicJob(rawText: string): JobPostingStructured {
  const lines = rawText.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const title = lines[0]?.slice(0, 200) ?? "Role";
  return {
    title,
    company: "Company",
    requiredQualifications: [],
    preferredQualifications: [],
    skills: [],
    responsibilities: lines.slice(1, 20),
    keywords: rawText
      .split(/\W+/)
      .filter((w) => w.length > 4)
      .slice(0, 40),
  };
}

export async function analyzeJobText(rawText: string): Promise<JobPostingStructured> {
  const { getOpenAI } = await import("./ai/client");
  if (!getOpenAI()) {
    return heuristicJob(rawText);
  }
  try {
    const json = await completeJson({
      system: JOB_ANALYSIS_SYSTEM,
      user: jobAnalysisUserPrompt(rawText),
    });
    return JSON.parse(json) as JobPostingStructured;
  } catch {
    return heuristicJob(rawText);
  }
}

export async function extractJobFromUrlOrThrow(url: string): Promise<{
  rawText: string;
  structured: JobPostingStructured;
  platform: JobPlatform;
  needsPaste: boolean;
  note?: string;
}> {
  const platform = detectPlatform(url);
  const { text, blocked } = await fetchJobPageText(url);
  if (blocked || text.length < 120) {
    return {
      rawText: "",
      structured: heuristicJob(""),
      platform,
      needsPaste: true,
      note:
        "Could not read this URL automatically (blocked or empty). Paste the job description below.",
    };
  }
  const structured = await analyzeJobText(text);
  return { rawText: text, structured, platform, needsPaste: false };
}
