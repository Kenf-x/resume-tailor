import { NextResponse } from "next/server";
import { getFallbackStore, useDb } from "@/lib/fallback-store";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";

export async function GET() {
  try {
    const userId = await ensureDefaultUser();
    if (!useDb()) {
      const rows = getFallbackStore().uploaded
        .filter((r) => r.userId === userId)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
      return NextResponse.json({
        resumes: rows.map((r) => ({
          id: r.id,
          sourceFileName: r.sourceFileName,
          mimeType: r.mimeType,
          parseStatus: r.parseStatus,
          parseError: r.parseError,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          hasParsed: Boolean(r.structured),
        })),
      });
    }
    const rows = await prisma.uploadedResume.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { parsed: true },
    });
    return NextResponse.json({
      resumes: rows.map((r) => ({
        id: r.id,
        sourceFileName: r.sourceFileName,
        mimeType: r.mimeType,
        parseStatus: r.parseStatus,
        parseError: r.parseError,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        hasParsed: Boolean(r.parsed),
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list resumes" }, { status: 500 });
  }
}
