import type { JobPostingStructured, StructuredResume } from "@/types/resume";

/** Prisma `Json` is `JsonValue`; narrow to our shapes for TypeScript. */
export function prismaJsonToStructuredResume(
  value: unknown
): StructuredResume | null {
  if (value == null || typeof value !== "object") return null;
  return value as StructuredResume;
}

export function prismaJsonToJobPosting(
  value: unknown
): JobPostingStructured | null {
  if (value == null || typeof value !== "object") return null;
  return value as JobPostingStructured;
}
