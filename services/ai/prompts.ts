import type { StructuredResume, JobPostingStructured } from "@/types/resume";

export const RESUME_PARSE_SYSTEM = `You are a resume parser. Output ONLY valid JSON matching the schema. Rules:
- Do not invent employers, dates, degrees, or metrics. Use only text from the resume.
- If a field is unknown, use empty string, empty array, or omit optional fields.
- Normalize bullet points as strings without leading bullets in the JSON (no "•").
- Extract keywords as industry-relevant terms found in the document.`;

export function resumeParseUserPrompt(rawText: string): string {
  return `Parse this resume text into JSON with this exact shape:
{
  "header": { "fullName": string, "contact": { "email"?: string, "phone"?: string, "location"?: string, "linkedin"?: string, "website"?: string, "other"?: string[] } },
  "summary": string,
  "skills": string[],
  "experience": [{ "id": string, "company": string, "title": string, "location"?: string, "startDate"?: string, "endDate"?: string, "current"?: boolean, "bullets": string[], "summary"?: string }],
  "education": [{ "id": string, "institution": string, "degree"?: string, "field"?: string, "startDate"?: string, "endDate"?: string, "details"?: string[] }],
  "certifications": [{ "id": string, "name": string, "issuer"?: string, "date"?: string }],
  "projects": [{ "id": string, "name": string, "description"?: string, "technologies"?: string[], "bullets"?: string[], "link"?: string }],
  "keywords": string[]
}
Use stable random-looking ids for id fields (short alphanumeric).
Resume text:
---
${rawText.slice(0, 48000)}
---`;
}

export const MERGE_SYSTEM = `You merge multiple structured resumes into one master resume. Rules:
- Do not add employers, degrees, dates, or achievements not present in the inputs.
- Deduplicate overlapping roles and bullets; keep the clearest, most complete wording.
- Merge similar job entries under one company/title when clearly the same role.
- Preserve all distinct experience and skills from the sources.
- Output ONLY valid JSON matching the provided schema.`;

export function mergeUserPrompt(payload: StructuredResume[]): string {
  return `Merge these structured resumes into one master JSON object with the same schema as each input.
Inputs:
${JSON.stringify(payload).slice(0, 100000)}`;
}

export const JOB_ANALYSIS_SYSTEM = `You analyze job postings. Output ONLY valid JSON. Rules:
- Extract only what is stated or clearly implied in the text.
- Do not invent requirements or company facts not in the text.`;

export function jobAnalysisUserPrompt(rawText: string): string {
  return `Extract job posting fields as JSON:
{
  "title": string,
  "company": string,
  "requiredQualifications": string[],
  "preferredQualifications": string[],
  "skills": string[],
  "responsibilities": string[],
  "keywords": string[]
}
Job text:
---
${rawText.slice(0, 48000)}
---`;
}

export const TAILOR_SYSTEM = `You tailor a resume to a job posting using ONLY the master resume content. Rules:
- Never invent employers, titles, dates, degrees, certifications, or metrics.
- You may rephrase, reorder, and emphasize existing bullets; you may omit less relevant bullets.
- Incorporate job keywords naturally only where they reflect existing experience/skills.
- Keep ATS-friendly section titles: Summary, Skills, Experience, Education, Certifications, Projects.
- Apply proven hiring format conventions:
  - reverse-chronological experience order unless relevance requires a slight reorder
  - concise 1-2 line bullets that lead with strong action verbs
  - prioritize outcome/result language over responsibility-only wording
  - keep formatting single-column and parser-friendly (no tables/graphics in content)
- Output ONLY valid JSON for the structured resume schema.`;

export function tailorUserPrompt(
  master: StructuredResume,
  job: JobPostingStructured,
  intensity: "LIGHT" | "MODERATE" | "AGGRESSIVE"
): string {
  const intensityNote =
    intensity === "LIGHT"
      ? "Minimal edits: light reordering and keyword touch-ups."
      : intensity === "MODERATE"
        ? "Moderate edits: stronger alignment and reordering; keep length similar."
        : "Aggressive but truthful: maximize relevance by reordering and condensing; still no fabricated facts.";

  return `${intensityNote}

Master resume (source of truth):
${JSON.stringify(master).slice(0, 100000)}

Job posting analysis:
${JSON.stringify(job).slice(0, 32000)}

Return JSON with the same schema as the master resume.`;
}

export const MATCH_SYSTEM = `You compare a job posting to a resume and score keyword alignment. Rules:
- Base keywords only on the job text and resume text provided.
- Do not suggest adding false experience. Suggestions must be honest (e.g., rephrase existing content).
- Output ONLY valid JSON.`;

export function matchAnalysisUserPrompt(
  tailored: StructuredResume,
  job: JobPostingStructured
): string {
  return `Compare and return JSON:
{
  "matchedKeywords": string[],
  "missingKeywords": string[],
  "suggestions": string[],
  "matchScore": number
}
matchScore is 0-100 based on overlap of important terms and qualifications.
Job:
${JSON.stringify(job).slice(0, 24000)}
Resume:
${JSON.stringify(tailored).slice(0, 64000)}`;
}
