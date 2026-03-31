import { NextResponse } from "next/server";
import { TailoringIntensity } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";
import { analyzeMatch, tailorResume } from "@/services/tailor";
import type { JobPostingStructured, StructuredResume } from "@/types/resume";
import { structuredResumeToPlainText } from "@/services/export-text";

export async function POST(req: Request) {
  try {
    const userId = await ensureDefaultUser();
    const body = await req.json();
    const rawIntensity = String(body.intensity ?? "MODERATE").toUpperCase();
    const allowed: TailoringIntensity[] = ["LIGHT", "MODERATE", "AGGRESSIVE"];
    const intensity = (
      allowed.includes(rawIntensity as TailoringIntensity)
        ? rawIntensity
        : "MODERATE"
    ) as TailoringIntensity;
    const masterId = body.masterId as string | undefined;
    const jobPostingId = body.jobPostingId as string | undefined;
    const masterOverride = body.masterJson as StructuredResume | undefined;
    const jobOverride = body.jobJson as JobPostingStructured | undefined;

    let master: StructuredResume | null = masterOverride ?? null;
    if (!master && masterId) {
      const m = await prisma.masterResume.findFirst({
        where: { id: masterId, userId },
      });
      master = (m?.structuredJson as StructuredResume) ?? null;
    }
    if (!master) {
      const latest = await prisma.masterResume.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });
      master = (latest?.structuredJson as StructuredResume) ?? null;
    }
    if (!master) {
      return NextResponse.json(
        { error: "No master resume. Generate a master resume first." },
        { status: 400 }
      );
    }

    let job: JobPostingStructured | null = jobOverride ?? null;
    if (!job && jobPostingId) {
      const j = await prisma.jobPosting.findFirst({
        where: { id: jobPostingId, userId },
      });
      job = (j?.structuredJson as JobPostingStructured) ?? null;
    }
    if (!job) {
      return NextResponse.json(
        { error: "No job posting. Create a job posting first." },
        { status: 400 }
      );
    }

    const tailored = await tailorResume({
      master,
      job,
      intensity: intensity as "LIGHT" | "MODERATE" | "AGGRESSIVE",
    });
    const analysis = await analyzeMatch({ tailored, job });
    const rawText = structuredResumeToPlainText(tailored);

    const row = await prisma.tailoredResume.create({
      data: {
        userId,
        masterResumeId: masterId ?? null,
        jobPostingId: jobPostingId ?? null,
        intensity,
        structuredJson: tailored as object,
        rawText,
      },
    });

    await prisma.keywordMatchAnalysis.create({
      data: {
        tailoredResumeId: row.id,
        matchedKeywords: analysis.matchedKeywords,
        missingKeywords: analysis.missingKeywords,
        suggestions: analysis.suggestions,
        matchScore: analysis.matchScore,
      },
    });

    return NextResponse.json({
      id: row.id,
      tailored,
      analysis,
      rawText,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Tailoring failed" }, { status: 500 });
  }
}
