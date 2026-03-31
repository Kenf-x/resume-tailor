import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureDefaultUser } from "@/lib/user";
import { saveUploadedFile } from "@/lib/storage";
import { extractRawText, parseResumeToStructured } from "@/services/resume-parse";
import { ParseStatus } from "@prisma/client";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const userId = await ensureDefaultUser();
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sourceFileName = file.name || "resume.bin";
    const mimeType = file.type || "application/octet-stream";

    const id = crypto.randomUUID();
    const storagePath = await saveUploadedFile(buffer, id, sourceFileName);

    const uploaded = await prisma.uploadedResume.create({
      data: {
        id,
        userId,
        sourceFileName,
        storagePath,
        mimeType,
        parseStatus: ParseStatus.PENDING,
      },
    });

    let rawText: string;
    try {
      rawText = await extractRawText(buffer, mimeType, sourceFileName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Extract failed";
      await prisma.uploadedResume.update({
        where: { id: uploaded.id },
        data: { parseStatus: ParseStatus.FAILED, parseError: msg },
      });
      return NextResponse.json({ error: msg, id: uploaded.id }, { status: 422 });
    }

    await prisma.uploadedResume.update({
      where: { id: uploaded.id },
      data: { rawText },
    });

    let structured;
    try {
      structured = await parseResumeToStructured(rawText);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Parse failed";
      await prisma.uploadedResume.update({
        where: { id: uploaded.id },
        data: { parseStatus: ParseStatus.FAILED, parseError: msg },
      });
      return NextResponse.json({ error: msg, id: uploaded.id }, { status: 422 });
    }

    await prisma.parsedResume.create({
      data: {
        userId,
        uploadedResumeId: uploaded.id,
        rawText,
        structuredJson: structured as object,
      },
    });

    await prisma.uploadedResume.update({
      where: { id: uploaded.id },
      data: { parseStatus: ParseStatus.PARSED },
    });

    return NextResponse.json({
      id: uploaded.id,
      parseStatus: ParseStatus.PARSED,
      structured,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
