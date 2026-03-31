import { NextResponse } from "next/server";
import { TailoringIntensity } from "@prisma/client";
import { getFallbackStore, useDb } from "@/lib/fallback-store";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";
import { mergeResumes } from "@/services/resume-merge";
import { analyzeMatch, tailorResume } from "@/services/tailor";
import type { JobPostingStructured, StructuredResume, TailorOutputMode } from "@/types/resume";
import { prismaJsonToJobPosting, prismaJsonToStructuredResume } from "@/lib/prisma-json";
import { structuredResumeToPlainText } from "@/services/export-text";

export async function POST(req: Request) {
  try {
    const userId = await ensureDefaultUser();
    const body = await req.json();
    const rawIntensity = String(body.intensity ?? "MODERATE").toUpperCase();
    const rawOutputMode = String(body.outputMode ?? "CONCISE").toUpperCase();
    const allowed: TailoringIntensity[] = ["LIGHT", "MODERATE", "AGGRESSIVE"];
    const allowedOutputModes: TailorOutputMode[] = ["CONCISE", "FULL"];
    const intensity = (
      allowed.includes(rawIntensity as TailoringIntensity)
        ? rawIntensity
        : "MODERATE"
    ) as TailoringIntensity;
    const outputMode = (
      allowedOutputModes.includes(rawOutputMode as TailorOutputMode)
        ? rawOutputMode
        : "CONCISE"
    ) as TailorOutputMode;
    const masterId = body.masterId as string | undefined;
    const sourceResumeIds = (body.sourceResumeIds as string[] | undefined) ?? [];
    const jobPostingId = body.jobPostingId as string | undefined;
    const masterOverride = body.masterJson as StructuredResume | undefined;
    const jobOverride = body.jobJson as JobPostingStructured | undefined;

    const store = getFallbackStore();
    let master: StructuredResume | null = masterOverride ?? null;
    if (!master && sourceResumeIds.length) {
      if (!useDb()) {
        const selected = store.uploaded
          .filter((r) => r.userId === userId && sourceResumeIds.includes(r.id) && r.structured)
          .map((r) => r.structured as StructuredResume);
        if (selected.length) {
          master = await mergeResumes(selected);
        }
      } else {
        const parsed = await prisma.parsedResume.findMany({
          where: { userId, uploadedResumeId: { in: sourceResumeIds } },
        });
        const selected = parsed
          .map((p) => prismaJsonToStructuredResume(p.structuredJson))
          .filter(Boolean) as StructuredResume[];
        if (selected.length) {
          master = await mergeResumes(selected);
        }
      }
    }
    if (!master && masterId) {
      if (!useDb()) {
        master =
          store.master?.id === masterId && store.master.userId === userId
            ? store.master.structuredJson
            : null;
      } else {
        const m = await prisma.masterResume.findFirst({
          where: { id: masterId, userId },
        });
        master = prismaJsonToStructuredResume(m?.structuredJson);
      }
    }
    if (!master) {
      if (!useDb()) {
        master = store.master?.userId === userId ? store.master.structuredJson : null;
      } else {
        const latest = await prisma.masterResume.findFirst({
          where: { userId },
          orderBy: { updatedAt: "desc" },
        });
        master = prismaJsonToStructuredResume(latest?.structuredJson);
      }
    }
    if (!master) {
      return NextResponse.json(
        { error: "No source resume selected. Select at least one parsed resume." },
        { status: 400 }
      );
    }

    let job: JobPostingStructured | null = jobOverride ?? null;
    if (!job && jobPostingId) {
      if (!useDb()) {
        const stored = store.jobs.find((j) => j.id === jobPostingId && j.userId === userId);
        job = stored?.structured ?? null;
      } else {
        const j = await prisma.jobPosting.findFirst({
          where: { id: jobPostingId, userId },
        });
        job = prismaJsonToJobPosting(j?.structuredJson);
      }
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
      outputMode,
    });
    const analysis = await analyzeMatch({ tailored, job });
    const rawText = structuredResumeToPlainText(tailored);

    if (!useDb()) {
      const id = crypto.randomUUID();
      store.tailored.push({ id, userId, tailored, analysis, rawText });
      return NextResponse.json({
        id,
        tailored,
        analysis,
        rawText,
      });
    }

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
