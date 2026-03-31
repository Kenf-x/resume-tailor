"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { JobPostingStructured, KeywordMatchAnalysisData, StructuredResume } from "@/types/resume";
import { ResumeUploadZone } from "./resume-upload-zone";
import { WorkflowSteps } from "./workflow-steps";
import { Button } from "./ui/button";

type ResumeRow = {
  id: string;
  sourceFileName: string;
  parseStatus: string;
  parseError: string | null;
  createdAt: string;
  hasParsed: boolean;
};

export function ResumeDashboard() {
  const [resumes, setResumes] = useState<ResumeRow[]>([]);
  const [masterId, setMasterId] = useState<string | null>(null);
  const [masterText, setMasterText] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [jobPaste, setJobPaste] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStructured, setJobStructured] = useState<JobPostingStructured | null>(null);
  const [intensity, setIntensity] = useState<"LIGHT" | "MODERATE" | "AGGRESSIVE">("MODERATE");
  const [tailoredText, setTailoredText] = useState("");
  const [analysis, setAnalysis] = useState<KeywordMatchAnalysisData | null>(null);
  const [loading, setLoading] = useState<string | null>(null);

  const step = useMemo(() => {
    if (!resumes.length) return 0;
    if (masterText.trim().length < 20) return 1;
    if (!jobStructured) return 2;
    if (!tailoredText.trim()) return 3;
    return 4;
  }, [resumes.length, masterText, jobStructured, tailoredText]);

  const refreshResumes = useCallback(async () => {
    const res = await fetch("/api/resumes");
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Could not load resumes");
      return;
    }
    setResumes(data.resumes ?? []);
  }, []);

  const refreshMaster = useCallback(async () => {
    const res = await fetch("/api/master");
    const data = await res.json();
    if (!res.ok) return;
    if (data.master?.structuredJson) {
      setMasterId(data.master.id);
      setMasterText(JSON.stringify(data.master.structuredJson, null, 2));
    }
  }, []);

  useEffect(() => {
    void refreshResumes();
    void refreshMaster();
  }, [refreshResumes, refreshMaster]);

  const generateMaster = async () => {
    setLoading("master");
    try {
      const res = await fetch("/api/master", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Could not build master resume");
        return;
      }
      setMasterId(data.id);
      setMasterText(JSON.stringify(data.structuredJson, null, 2));
      toast.success("Master resume generated");
    } finally {
      setLoading(null);
    }
  };

  const saveMaster = async () => {
    let parsed: StructuredResume;
    try {
      parsed = JSON.parse(masterText) as StructuredResume;
    } catch {
      toast.error("Invalid JSON in master resume");
      return;
    }
    setLoading("save-master");
    try {
      const res = await fetch("/api/master", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: masterId, structuredJson: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed");
        return;
      }
      toast.success("Master resume saved");
    } finally {
      setLoading(null);
    }
  };

  const submitJob = async () => {
    if (!jobUrl.trim() && !jobPaste.trim()) {
      toast.error("Enter a job URL or paste the description");
      return;
    }
    setLoading("job");
    try {
      const res = await fetch("/api/job-postings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jobUrl || undefined, pasteText: jobPaste || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Job intake failed");
        return;
      }
      setJobId(data.id);
      setJobStructured(data.structured as JobPostingStructured);
      if (data.needsPaste) {
        toast.message("Paste the job description", {
          description: data.note || "Automatic extraction was blocked.",
        });
      } else {
        toast.success("Job posting captured");
      }
    } finally {
      setLoading(null);
    }
  };

  const runTailor = async () => {
    let masterJson: StructuredResume;
    try {
      masterJson = JSON.parse(masterText) as StructuredResume;
    } catch {
      toast.error("Fix master resume JSON before tailoring");
      return;
    }
    setLoading("tailor");
    try {
      const res = await fetch("/api/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterId: masterId ?? undefined,
          jobPostingId: jobId ?? undefined,
          intensity,
          masterJson,
          jobJson: jobStructured ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Tailoring failed");
        return;
      }
      setTailoredText(JSON.stringify(data.tailored, null, 2));
      setAnalysis(data.analysis as KeywordMatchAnalysisData);
      toast.success("Tailored resume ready");
    } finally {
      setLoading(null);
    }
  };

  const saveTailoredEdit = () => {
    try {
      JSON.parse(tailoredText) as StructuredResume;
      toast.success("Tailored resume JSON is valid");
    } catch {
      toast.error("Invalid JSON");
    }
  };

  const exportResume = async (format: "pdf" | "docx" | "txt") => {
    let resume: StructuredResume;
    try {
      resume = JSON.parse(tailoredText) as StructuredResume;
    } catch {
      toast.error("Fix tailored JSON before export");
      return;
    }
    setLoading(`export-${format}`);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format, resume, fileName: "tailored-resume" }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Export failed");
        return;
      }
      const blob = await res.blob();
      const ext = format === "txt" ? "txt" : format;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tailored-resume.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded .${ext}`);
    } finally {
      setLoading(null);
    }
  };

  const copyTailored = async () => {
    try {
      await navigator.clipboard.writeText(tailoredText);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
      <header className="space-y-3 border-b border-zinc-200 pb-8 dark:border-zinc-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          Resume Tailor
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Master resume & job-specific versions
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Upload multiple resumes, merge into one master profile, then tailor it to a posting.
          Content stays grounded in your uploads and edits—configure{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">OPENAI_API_KEY</code> for
          AI parsing and tailoring.
        </p>
        <WorkflowSteps active={step} />
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            1. Upload resumes
          </h2>
          <ResumeUploadZone onUploaded={() => void refreshResumes()} disabled={Boolean(loading)} />
          <ul className="space-y-2 text-sm">
            {resumes.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-800"
              >
                <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">
                  {r.sourceFileName}
                </span>
                <span
                  className={
                    r.parseStatus === "PARSED"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-amber-600"
                  }
                >
                  {r.parseStatus}
                </span>
              </li>
            ))}
            {!resumes.length && (
              <li className="text-zinc-500">No files yet. Upload PDF, DOCX, or TXT.</li>
            )}
          </ul>
          <Button
            disabled={!resumes.some((r) => r.parseStatus === "PARSED") || Boolean(loading)}
            onClick={() => void generateMaster()}
          >
            {loading === "master" ? "Generating…" : "Generate master resume"}
          </Button>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            2. Master resume (edit JSON)
          </h2>
          <textarea
            className="min-h-[280px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={masterText}
            onChange={(e) => setMasterText(e.target.value)}
            spellCheck={false}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void saveMaster()} disabled={Boolean(loading)}>
              {loading === "save-master" ? "Saving…" : "Save master"}
            </Button>
            <Button variant="ghost" onClick={() => void refreshMaster()}>
              Reload from server
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            3. Job posting
          </h2>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Job URL (LinkedIn, Indeed, ZipRecruiter)
            <input
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder="https://"
            />
          </label>
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Or paste full description
            <textarea
              className="mt-1 min-h-[140px] w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={jobPaste}
              onChange={(e) => setJobPaste(e.target.value)}
              placeholder="Paste the job description if the URL is blocked…"
            />
          </label>
          <Button onClick={() => void submitJob()} disabled={Boolean(loading)}>
            {loading === "job" ? "Processing…" : "Analyze job"}
          </Button>
          {jobStructured && (
            <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-xs text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
              {JSON.stringify(jobStructured, null, 2)}
            </pre>
          )}
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            4. Tailor
          </h2>
          <div className="flex flex-wrap gap-2">
            {(["LIGHT", "MODERATE", "AGGRESSIVE"] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIntensity(i)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  intensity === i
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                {i === "LIGHT" ? "Light" : i === "MODERATE" ? "Moderate" : "Aggressive"}
              </button>
            ))}
          </div>
          <Button
            onClick={() => void runTailor()}
            disabled={
              Boolean(loading) || !jobStructured || masterText.trim().length < 20
            }
          >
            {loading === "tailor" ? "Tailoring…" : "Generate tailored resume"}
          </Button>
          {analysis && (
            <div className="space-y-2 rounded-xl border border-zinc-100 p-4 text-sm dark:border-zinc-800">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                Match score: {Math.round(analysis.matchScore)}%
              </p>
              <p className="text-xs text-zinc-500">Matched keywords</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                {analysis.matchedKeywords.slice(0, 12).join(", ")}
              </p>
              <p className="text-xs text-zinc-500">Missing keywords</p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {analysis.missingKeywords.slice(0, 12).join(", ")}
              </p>
              <p className="text-xs text-zinc-500">Suggestions</p>
              <ul className="list-disc pl-4 text-xs text-zinc-700 dark:text-zinc-300">
                {analysis.suggestions.slice(0, 6).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          5. Tailored resume & export
        </h2>
        <textarea
          className="min-h-[320px] w-full rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          value={tailoredText}
          onChange={(e) => setTailoredText(e.target.value)}
          spellCheck={false}
          placeholder="Tailored JSON appears here after you run “Generate tailored resume”."
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => saveTailoredEdit()}>
            Apply JSON edits
          </Button>
          <Button variant="secondary" onClick={() => void copyTailored()}>
            Copy to clipboard
          </Button>
          <Button variant="secondary" onClick={() => void exportResume("pdf")} disabled={!tailoredText}>
            {loading === "export-pdf" ? "…" : "Download PDF"}
          </Button>
          <Button variant="secondary" onClick={() => void exportResume("docx")} disabled={!tailoredText}>
            {loading === "export-docx" ? "…" : "Download DOCX"}
          </Button>
          <Button variant="secondary" onClick={() => void exportResume("txt")} disabled={!tailoredText}>
            {loading === "export-txt" ? "…" : "Download TXT"}
          </Button>
        </div>
      </section>
    </div>
  );
}
