import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  BorderStyle,
  TextRun,
} from "docx";
import type { StructuredResume } from "@/types/resume";

export async function structuredResumeToDocxBuffer(r: StructuredResume): Promise<Buffer> {
  const PRIMARY_HEX = "1F4872";
  const BODY_FONT = "Times New Roman";
  const HEADING_FONT = "Century Gothic";
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: r.header.fullName.toUpperCase(),
          bold: true,
          size: 34,
          font: HEADING_FONT,
          color: PRIMARY_HEX,
        }),
      ],
    })
  );
  const c = r.header.contact;
  const contactLine = [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean).join(" | ");
  if (contactLine) {
    children.push(
      new Paragraph({
        spacing: { after: 180 },
        border: {
          bottom: {
            color: "D4DEEA",
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        children: [
          new TextRun({
            text: contactLine,
            size: 22,
            font: BODY_FONT,
            color: "4E6175",
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 80, after: 60 },
      children: [new TextRun({ text: "SUMMARY", bold: true, font: HEADING_FONT, color: PRIMARY_HEX })],
    })
  );
  children.push(new Paragraph({ children: [new TextRun({ text: r.summary, font: BODY_FONT })] }));

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: "SKILLS", bold: true, font: HEADING_FONT, color: PRIMARY_HEX })],
    })
  );
  children.push(new Paragraph({ children: [new TextRun({ text: r.skills.join(", "), font: BODY_FONT })] }));

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: "EXPERIENCE", bold: true, font: HEADING_FONT, color: PRIMARY_HEX })],
    })
  );
  for (const ex of r.experience) {
    children.push(
      new Paragraph({
        spacing: { before: 80 },
        children: [
          new TextRun({ text: `${ex.title} — ${ex.company}`, bold: true, color: PRIMARY_HEX, font: HEADING_FONT }),
        ],
      })
    );
    if (ex.startDate || ex.endDate) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: [ex.startDate, ex.endDate].filter(Boolean).join(" – "),
              font: BODY_FONT,
              size: 20,
              color: "5F7388",
            }),
          ],
        })
      );
    }
    for (const b of ex.bullets) {
      children.push(new Paragraph({ children: [new TextRun({ text: `• ${b}`, font: BODY_FONT })] }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: "EDUCATION", bold: true, font: HEADING_FONT, color: PRIMARY_HEX })],
    })
  );
  for (const ed of r.education) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${ed.institution}${ed.degree ? ` — ${ed.degree}` : ""}${ed.field ? `, ${ed.field}` : ""}`,
            font: BODY_FONT,
          }),
        ],
      })
    );
  }

  if (r.certifications.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 60 },
        children: [new TextRun({ text: "CERTIFICATIONS", bold: true, font: HEADING_FONT, color: PRIMARY_HEX })],
      })
    );
    for (const cert of r.certifications) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}`, font: BODY_FONT })],
        })
      );
    }
  }

  if (r.projects.length) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 60 },
        children: [new TextRun({ text: "PROJECTS", bold: true, font: HEADING_FONT, color: PRIMARY_HEX })],
      })
    );
    for (const p of r.projects) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: p.name, bold: true, color: PRIMARY_HEX, font: HEADING_FONT })],
        })
      );
      if (p.description) children.push(new Paragraph({ children: [new TextRun({ text: p.description, font: BODY_FONT })] }));
      for (const b of p.bullets ?? []) {
        children.push(new Paragraph({ children: [new TextRun({ text: `• ${b}`, font: BODY_FONT })] }));
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

