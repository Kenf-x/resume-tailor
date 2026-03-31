import { cn } from "@/lib/utils";

const STEPS = [
  "Upload resumes",
  "Select source resumes",
  "Job posting",
  "Tailor",
  "Export",
] as const;

export function WorkflowSteps({ active }: { active: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-xs font-medium text-zinc-500 sm:gap-4 sm:text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] sm:h-8 sm:w-8 sm:text-xs",
              i <= active
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:border-emerald-500 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
            )}
          >
            {i + 1}
          </span>
          <span
            className={cn(
              "hidden sm:inline",
              i === active ? "text-zinc-900 dark:text-zinc-100" : ""
            )}
          >
            {label}
          </span>
        </li>
      ))}
    </ol>
  );
}
