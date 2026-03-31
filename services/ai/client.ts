import OpenAI from "openai";
import { hasOpenAI } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  if (!hasOpenAI()) return null;
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function completeJson(options: {
  system: string;
  user: string;
  model?: string;
}): Promise<string> {
  const openai = getOpenAI();
  if (!openai) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const res = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      { role: "system", content: options.system },
      { role: "user", content: options.user },
    ],
    response_format: { type: "json_object" },
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("Empty model response");
  return text;
}
