import { NextResponse } from "next/server";
import { ensureDefaultUser } from "@/lib/user";
import type { StructuredResume } from "@/types/resume";
import { structuredResumeToDocxBuffer } from "@/services/export-docx";
import { structuredResumeToPdfBuffer } from "@/services/export-pdf";
import { structuredResumeToPlainText } from "@/services/export-text";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensureDefaultUser();
    const body = await req.json();
    const format = (body.format as string)?.toLowerCase() ?? "txt";
    const resume = body.resume as StructuredResume | undefined;
    if (!resume) {
      return NextResponse.json({ error: "resume JSON required" }, { status: 400 });
    }

    const fileNameBase = (body.fileName as string)?.replace(/[^\w.-]+/g, "_") || "resume";

    if (format === "txt" || format === "text") {
      const text = structuredResumeToPlainText(resume);
      return new NextResponse(text, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${fileNameBase}.txt"`,
        },
      });
    }

    if (format === "docx") {
      const buf = await structuredResumeToDocxBuffer(resume);
      return new NextResponse(buf, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${fileNameBase}.docx"`,
        },
      });
    }

    if (format === "pdf") {
      const buf = await structuredResumeToPdfBuffer(resume);
      return new NextResponse(buf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileNameBase}.pdf"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
