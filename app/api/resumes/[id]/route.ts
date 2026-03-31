import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await ensureDefaultUser();
    const { id } = await ctx.params;
    const row = await prisma.uploadedResume.findFirst({
      where: { id, userId },
      include: { parsed: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      resume: row,
      structured: row.parsed?.structuredJson ?? null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
