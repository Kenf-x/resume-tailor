export function getDefaultUserId(): string {
  return process.env.DEFAULT_USER_ID ?? "default-user";
}

export function hasOpenAI(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function allowHeuristicFallback(): boolean {
  const v = (process.env.ALLOW_HEURISTIC_FALLBACK ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function getUploadDir(): string {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  if (process.env.VERCEL) return "/tmp/resume-uploads";
  return "./uploads";
}
