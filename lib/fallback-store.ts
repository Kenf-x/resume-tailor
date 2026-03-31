import { getDefaultUserId } from "@/lib/env";
import type {
  JobPostingStructured,
  KeywordMatchAnalysisData,
  StructuredResume,
} from "@/types/resume";

type UploadedFallback = {
  id: string;
  userId: string;
  sourceFileName: string;
  mimeType: string;
  parseStatus: "PENDING" | "PARSED" | "FAILED";
  parseError: string | null;
  createdAt: string;
  updatedAt: string;
  rawText?: string;
  structured?: StructuredResume;
};

type MasterFallback = {
  id: string;
  userId: string;
  structuredJson: StructuredResume;
  updatedAt: string;
};

type JobFallback = {
  id: string;
  userId: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  rawText: string;
  structured: JobPostingStructured;
  note?: string;
};

type TailoredFallback = {
  id: string;
  userId: string;
  tailored: StructuredResume;
  analysis: KeywordMatchAnalysisData;
  rawText: string;
};

type FallbackStore = {
  uploaded: UploadedFallback[];
  master: MasterFallback | null;
  jobs: JobFallback[];
  tailored: TailoredFallback[];
};

const globalForStore = globalThis as unknown as { __resumeFallbackStore?: FallbackStore };
const globalForFlags = globalThis as unknown as { __forceFallbackDb?: boolean };

export function useDb(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim()) && !globalForFlags.__forceFallbackDb;
}

export function getFallbackStore(): FallbackStore {
  if (!globalForStore.__resumeFallbackStore) {
    globalForStore.__resumeFallbackStore = {
      uploaded: [],
      master: null,
      jobs: [],
      tailored: [],
    };
  }
  return globalForStore.__resumeFallbackStore;
}

export function getFallbackUserId(): string {
  return getDefaultUserId();
}

export function disableDbFallbackMode(): void {
  globalForFlags.__forceFallbackDb = true;
}
