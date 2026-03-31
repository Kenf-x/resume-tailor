import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { StructuredResume } from "@/types/resume";
import { structuredResumeToPlainText } from "./export-text";

const MARGIN = 50;
const LINE_GAP = 13;
const PAGE_W = 612;
const PAGE_H = 792;
const FONT_SIZE = 11;
const MAX_LINE_W = PAGE_W - 2 * MARGIN;

export async function structuredResumeToPdfBuffer(r: StructuredResume): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const colorPrimary = rgb(0.12, 0.28, 0.45);
  const colorBody = rgb(0.1, 0.1, 0.12);
  const colorMeta = rgb(0.3, 0.38, 0.46);

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
    const isSectionHeading =
      raw === raw.toUpperCase() && raw.length < 40 && raw.length > 2 && !raw.includes("•");
    const isName = raw.trim() === r.header.fullName.trim();
    const isContact = raw.includes("@") && raw.includes("|");
    const size = isName ? 18 : isSectionHeading ? 11 : isContact ? 10 : FONT_SIZE;
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
        color: isName || isSectionHeading ? colorPrimary : isContact ? colorMeta : colorBody,
      });
      y -= LINE_GAP;
      if (isContact && chunk === remaining.slice(0, cut).trimEnd()) {
        page.drawLine({
          start: { x: MARGIN, y: y - 2 },
          end: { x: PAGE_W - MARGIN, y: y - 2 },
          thickness: 0.8,
          color: rgb(0.83, 0.87, 0.92),
        });
        y -= 8;
      }
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
