import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { StructuredResume } from "@/types/resume";

export async function structuredResumeToDocxBuffer(r: StructuredResume): Promise<Buffer> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      children: [new TextRun({ text: r.header.fullName, bold: true, size: 32 })],
    })
  );
  const c = r.header.contact;
  const contactLine = [c.email, c.phone, c.location, c.linkedin, c.website].filter(Boolean).join(" | ");
  if (contactLine) {
    children.push(new Paragraph({ children: [new TextRun({ text: contactLine, size: 22 })] }));
  }
  children.push(new Paragraph({ text: "" }));

  children.push(
    new Paragraph({ text: "Summary", heading: HeadingLevel.HEADING_2 })
  );
  children.push(new Paragraph({ text: r.summary }));

  children.push(
    new Paragraph({ text: "Skills", heading: HeadingLevel.HEADING_2 })
  );
  children.push(new Paragraph({ text: r.skills.join(", ") }));

  children.push(
    new Paragraph({ text: "Experience", heading: HeadingLevel.HEADING_2 })
  );
  for (const ex of r.experience) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${ex.title} — ${ex.company}`, bold: true }),
        ],
      })
    );
    if (ex.startDate || ex.endDate) {
      children.push(
        new Paragraph({
          text: [ex.startDate, ex.endDate].filter(Boolean).join(" – "),
        })
      );
    }
    for (const b of ex.bullets) {
      children.push(new Paragraph({ text: `• ${b}` }));
    }
    children.push(new Paragraph({ text: "" }));
  }

  children.push(
    new Paragraph({ text: "Education", heading: HeadingLevel.HEADING_2 })
  );
  for (const ed of r.education) {
    children.push(
      new Paragraph({
        text: `${ed.institution}${ed.degree ? ` — ${ed.degree}` : ""}${ed.field ? `, ${ed.field}` : ""}`,
      })
    );
  }

  if (r.certifications.length) {
    children.push(
      new Paragraph({ text: "Certifications", heading: HeadingLevel.HEADING_2 })
    );
    for (const cert of r.certifications) {
      children.push(new Paragraph({ text: `${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}` }));
    }
  }

  if (r.projects.length) {
    children.push(
      new Paragraph({ text: "Projects", heading: HeadingLevel.HEADING_2 })
    );
    for (const p of r.projects) {
      children.push(new Paragraph({ children: [new TextRun({ text: p.name, bold: true })] }));
      if (p.description) children.push(new Paragraph({ text: p.description }));
      for (const b of p.bullets ?? []) {
        children.push(new Paragraph({ text: `• ${b}` }));
      }
    }
  }

  const doc = new Document({
    sections: [{ children }],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

export { structuredResumeToPlainText };
