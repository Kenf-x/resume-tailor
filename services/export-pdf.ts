import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { StructuredResume } from "@/types/resume";
import { structuredResumeToPlainText } from "./export-text";

const MARGIN = 50;
const LINE_GAP = 13;
const PAGE_W = 612;
const PAGE_H = 792;
const FONT_SIZE = 10;
const MAX_LINE_W = PAGE_W - 2 * MARGIN;

export async function structuredResumeToPdfBuffer(r: StructuredResume): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const text = structuredResumeToPlainText(r);
  const lines = text.split("\n");

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensureSpace = () => {
    if (y < MARGIN + 24) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const drawLine = (raw: string, bold = false) => {
    const f = bold ? fontBold : font;
    const size =
      raw === raw.toUpperCase() && raw.length < 40 && raw.length > 2 && !raw.includes("•")
        ? 11
        : FONT_SIZE;
    let remaining = raw.trimEnd();
    while (remaining.length) {
      ensureSpace();
      let cut = remaining.length;
      while (cut > 0 && f.widthOfTextAtSize(remaining.slice(0, cut), size) > MAX_LINE_W) {
        const space = remaining.lastIndexOf(" ", cut);
        cut = space > 0 ? space : cut - 1;
      }
      if (cut <= 0) cut = 1;
      const chunk = remaining.slice(0, cut).trimEnd();
      page.drawText(chunk, {
        x: MARGIN,
        y,
        size,
        font: f,
        color: rgb(0.1, 0.1, 0.12),
      });
      y -= LINE_GAP;
      remaining = remaining.slice(cut).trimStart();
    }
  };

  for (const line of lines) {
    const isHeading =
      /^(SUMMARY|SKILLS|EXPERIENCE|EDUCATION|CERTIFICATIONS|PROJECTS)$/i.test(line.trim());
    drawLine(line, isHeading);
  }

  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
