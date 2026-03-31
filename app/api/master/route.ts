import { NextResponse } from "next/server";
import { getFallbackStore, useDb } from "@/lib/fallback-store";
import { prismaJsonToStructuredResume } from "@/lib/prisma-json";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";
import { mergeResumes } from "@/services/resume-merge";

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    if (!useDb()) {
      const master = getFallbackStore().master;
      if (!master || master.userId !== userId) {
        return NextResponse.json({ master: null });
      }
      return NextResponse.json({ master });
    }
    const master = await prisma.masterResume.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    if (!master) {
      return NextResponse.json({ master: null });
    }
    return NextResponse.json({
      master: {
        id: master.id,
        structuredJson: master.structuredJson,
        updatedAt: master.updatedAt,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await ensureDefaultUser();
    if (!useDb()) {
      const store = getFallbackStore();
      const resumes = store.uploaded
        .filter((r) => r.userId === userId && r.structured)
        .map((r) => r.structured!);
      if (!resumes.length) {
        return NextResponse.json(
          { error: "No parsed resumes. Upload and parse resumes first." },
          { status: 400 }
        );
      }
      const merged = await mergeResumes(resumes);
      const master = {
        id: crypto.randomUUID(),
        userId,
        structuredJson: merged,
        updatedAt: new Date().toISOString(),
      };
      store.master = master;
      return NextResponse.json({
        id: master.id,
        structuredJson: merged,
      });
    }
    const parsedList = await prisma.parsedResume.findMany({
      where: { userId },
      include: { uploadedResume: true },
    });
    if (!parsedList.length) {
      return NextResponse.json(
        { error: "No parsed resumes. Upload and parse resumes first." },
        { status: 400 }
      );
    }

    const resumes = parsedList.map((p) => {
      const r = prismaJsonToStructuredResume(p.structuredJson);
      if (!r) {
        throw new Error("Invalid stored parsed resume JSON");
      }
      return r;
    });
    const merged = await mergeResumes(resumes);

    const master = await prisma.masterResume.create({
      data: {
        userId,
        structuredJson: merged as object,
        sourceSummary: `Merged from ${parsedList.length} resume(s)`,
      },
    });

    return NextResponse.json({
      id: master.id,
      structuredJson: merged,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Merge failed" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const userId = await ensureDefaultUser();
    const body = await req.json();
    const structured = prismaJsonToStructuredResume(body.structuredJson);
    const id = body.id as string | undefined;
    if (!structured) {
      return NextResponse.json({ error: "structuredJson required" }, { status: 400 });
    }

    if (!useDb()) {
      const store = getFallbackStore();
      const id = (body.id as string | undefined) ?? crypto.randomUUID();
      store.master = {
        id,
        userId,
        structuredJson: structured,
        updatedAt: new Date().toISOString(),
      };
      return NextResponse.json({ id, ok: true });
    }

    if (id) {
      const updated = await prisma.masterResume.updateMany({
        where: { id, userId },
        data: { structuredJson: structured as object },
      });
      if (!updated.count) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true });
    }

    const master = await prisma.masterResume.create({
      data: {
        userId,
        structuredJson: structured as object,
      },
    });
    return NextResponse.json({ id: master.id, ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
