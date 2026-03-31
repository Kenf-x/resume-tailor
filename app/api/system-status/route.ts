import { NextResponse } from "next/server";
import { hasOpenAI } from "@/lib/env";

export async function GET() {
  return NextResponse.json({
    openAIConfigured: hasOpenAI(),
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    allowHeuristicFallback: /^(1|true|yes)$/i.test(
      String(process.env.ALLOW_HEURISTIC_FALLBACK ?? "")
    ),
  });
}
