import { generateId } from "@/lib/utils";
import { allowHeuristicFallback } from "@/lib/env";
import type { StructuredResume } from "@/types/resume";
import { completeJson } from "./ai/client";
import { RESUME_PARSE_SYSTEM, resumeParseUserPrompt } from "./ai/prompts";

export async function extractRawText(buffer: Buffer, mimeType: string, fileName: string): Promise<string> {
  const lower = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (mime.includes("pdf") || lower.endsWith(".pdf")) {
    const mod = await import("pdf-parse");
    const pdfParse = mod.default as (data: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return normalizeWhitespace(data.text);
  }

  if (
    mime.includes("wordprocessingml") ||
    mime.includes("msword") ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return normalizeWhitespace(result.value);
  }

  if (mime.includes("text") || mime.includes("plain") || lower.endsWith(".txt")) {
    return normalizeWhitespace(buffer.toString("utf-8"));
  }

  throw new Error(`Unsupported file type: ${mimeType || fileName}`);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Rule-based fallback when no LLM — minimal structure from raw text. */
export function heuristicStructuredResume(rawText: string): StructuredResume {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);
  const emailMatch = rawText.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/);
  const phoneMatch = rawText.match(/(\+?\d[\d\s().-]{8,}\d)/);
  const firstLine = lines[0] ?? "Candidate";
  const nameGuess = firstLine.length < 80 && !emailMatch?.[0]?.includes(firstLine) ? firstLine : "Candidate";

  return {
    header: {
      fullName: nameGuess,
      contact: {
        email: emailMatch?.[0],
        phone: phoneMatch?.[0]?.replace(/\s+/g, " "),
      },
    },
    summary: lines.slice(1, 4).join(" ").slice(0, 800),
    skills: extractSkillsHeuristic(rawText),
    experience: [
      {
        id: generateId("exp"),
        company: "See full text",
        title: "Experience",
        bullets: lines.filter((l) => l.length > 20).slice(0, 12),
      },
    ],
    education: [],
    certifications: [],
    projects: [],
    keywords: extractSkillsHeuristic(rawText).slice(0, 20),
  };
}

function extractSkillsHeuristic(text: string): string[] {
  const skillSection = text.match(/skills?[:\s]*([^\n]+(?:\n[^\n]+){0,12})/i);
  if (skillSection) {
    return skillSection[1]
      .split(/[,;|•\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  return [];
}

export async function parseResumeToStructured(rawText: string): Promise<StructuredResume> {
  const { getOpenAI } = await import("./ai/client");
  if (!getOpenAI()) {
    if (!allowHeuristicFallback()) {
      throw new Error(
        "OpenAI is not configured. Set OPENAI_API_KEY (or enable ALLOW_HEURISTIC_FALLBACK=true for basic mode)."
      );
    }
    return heuristicStructuredResume(rawText);
  }
  try {
    const json = await completeJson({
      system: RESUME_PARSE_SYSTEM,
      user: resumeParseUserPrompt(rawText),
    });
    const parsed = JSON.parse(json) as StructuredResume;
    return normalizeStructuredResume(parsed);
  } catch (err) {
    if (!allowHeuristicFallback()) {
      const msg = err instanceof Error ? err.message : "Unknown parse error";
      throw new Error(`OpenAI resume parsing failed: ${msg}`);
    }
    return heuristicStructuredResume(rawText);
  }
}

function normalizeStructuredResume(r: StructuredResume): StructuredResume {
  return {
    header: {
      fullName: r.header?.fullName ?? "Candidate",
      contact: r.header?.contact ?? {},
    },
    summary: r.summary ?? "",
    skills: Array.isArray(r.skills) ? r.skills : [],
    experience: Array.isArray(r.experience) ? r.experience : [],
    education: Array.isArray(r.education) ? r.education : [],
    certifications: Array.isArray(r.certifications) ? r.certifications : [],
    projects: Array.isArray(r.projects) ? r.projects : [],
    keywords: Array.isArray(r.keywords) ? r.keywords : [],
  };
}
