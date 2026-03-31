import { NextResponse } from "next/server";
import { getFallbackStore, useDb } from "@/lib/fallback-store";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";
import {
  analyzeJobText,
  detectPlatform,
  extractJobFromUrlOrThrow,
} from "@/services/job-extract";
import type { JobPostingStructured } from "@/types/resume";

export async function POST(req: Request) {
  try {
    const userId = await ensureDefaultUser();
    const body = await req.json();
    const url = (body.url as string | undefined)?.trim();
    const pasteText = (body.pasteText as string | undefined)?.trim();

    if (!url && !pasteText) {
      return NextResponse.json(
        { error: "Provide url or pasteText" },
        { status: 400 }
      );
    }

    const store = getFallbackStore();
    let rawText: string;
    let platform: string;
    let structured: JobPostingStructured;
    let extractionNote: string | undefined;

    if (pasteText) {
      rawText = pasteText;
      platform = url ? detectPlatform(url) : "paste";
      structured = await analyzeJobText(rawText);
    } else if (url) {
      const result = await extractJobFromUrlOrThrow(url);
      if (result.needsPaste) {
        if (!useDb()) {
          const row = {
            id: crypto.randomUUID(),
            userId,
            sourceUrl: url,
            sourcePlatform: result.platform,
            rawText: "",
            structured: result.structured,
            note: result.note ?? "Paste required",
          };
          store.jobs.push(row);
          return NextResponse.json({
            id: row.id,
            needsPaste: true,
            note: result.note,
            structured: result.structured,
          });
        }
        const row = await prisma.jobPosting.create({
          data: {
            userId,
            sourceUrl: url,
            sourcePlatform: result.platform,
            rawText: "",
            structuredJson: result.structured as object,
            extractionNote: result.note ?? "Paste required",
          },
        });
        return NextResponse.json({
          id: row.id,
          needsPaste: true,
          note: result.note,
          structured: result.structured,
        });
      }
      rawText = result.rawText;
      platform = result.platform;
      structured = result.structured;
    } else {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (!useDb()) {
      const row = {
        id: crypto.randomUUID(),
        userId,
        sourceUrl: url ?? undefined,
        sourcePlatform: platform,
        rawText,
        structured,
        note: extractionNote,
      };
      store.jobs.push(row);
      return NextResponse.json({
        id: row.id,
        needsPaste: false,
        structured,
        rawText,
      });
    }

    const row = await prisma.jobPosting.create({
      data: {
        userId,
        sourceUrl: url ?? null,
        sourcePlatform: platform,
        rawText,
        structuredJson: structured as object,
        extractionNote,
      },
    });

    return NextResponse.json({
      id: row.id,
      needsPaste: false,
      structured,
      rawText,
    });
  } catch (e) {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Job intake failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
