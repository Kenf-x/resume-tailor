import type { StructuredResume } from "@/types/resume";

export function structuredResumeToPlainText(r: StructuredResume): string {
  const lines: string[] = [];
  lines.push(r.header.fullName);
  const c = r.header.contact;
  const contactBits = [c.email, c.phone, c.location, c.linkedin, c.website]
    .filter(Boolean)
    .join(" | ");
  if (contactBits) lines.push(contactBits);
  lines.push("");
  lines.push("SUMMARY");
  lines.push(r.summary);
  lines.push("");
  lines.push("SKILLS");
  lines.push(r.skills.join(", "));
  lines.push("");
  lines.push("EXPERIENCE");
  for (const ex of r.experience) {
    lines.push(`${ex.title} — ${ex.company}`);
    if (ex.startDate || ex.endDate) {
      lines.push([ex.startDate, ex.endDate].filter(Boolean).join(" – "));
    }
    for (const b of ex.bullets) {
      lines.push(`• ${b}`);
    }
    lines.push("");
  }
  lines.push("EDUCATION");
  for (const ed of r.education) {
    lines.push(`${ed.institution}${ed.degree ? ` — ${ed.degree}` : ""}${ed.field ? `, ${ed.field}` : ""}`);
  }
  lines.push("");
  if (r.certifications.length) {
    lines.push("CERTIFICATIONS");
    for (const cert of r.certifications) {
      lines.push(`${cert.name}${cert.issuer ? ` (${cert.issuer})` : ""}`);
    }
    lines.push("");
  }
  if (r.projects.length) {
    lines.push("PROJECTS");
    for (const p of r.projects) {
      lines.push(p.name);
      if (p.description) lines.push(p.description);
      for (const b of p.bullets ?? []) lines.push(`• ${b}`);
    }
  }
  return lines.join("\n").trim();
}
