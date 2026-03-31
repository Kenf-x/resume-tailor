"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

export function ResumeUploadZone({
  onUploaded,
  disabled,
}: {
  onUploaded: () => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setBusy(true);
      try {
        for (const file of Array.from(files)) {
          const fd = new FormData();
          fd.append("file", file);
          const res = await fetch("/api/resumes/upload", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (!res.ok) {
            toast.error(data.error || "Upload failed");
            continue;
          }
          toast.success(`Parsed: ${file.name}`);
        }
        onUploaded();
      } finally {
        setBusy(false);
      }
    },
    [onUploaded]
  );

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-8 text-center transition-colors",
        drag ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20" : "border-zinc-200 dark:border-zinc-700",
        disabled && "pointer-events-none opacity-50"
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        void upload(e.dataTransfer.files);
      }}
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Drop PDF, DOCX, or TXT files here, or choose files.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="sr-only"
          multiple
          disabled={busy || disabled}
          onChange={(e) => void upload(e.target.files)}
        />
        <Button
          variant="secondary"
          disabled={busy || disabled}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>
      {busy && <p className="mt-3 text-xs text-zinc-500">Uploading…</p>}
    </div>
  );
}
