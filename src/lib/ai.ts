// ─── AI Types ───────────────────────────────────────────────────────────────

import { nativeHttp } from "@/lib/nativeHttp";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/app.store";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ThematicCode {
  name: string;
  rationale: string;
}

export interface ThematicResult {
  codes: ThematicCode[];
}

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(key: string): "openai" | "anthropic" | "gemini" {
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza")) return "gemini";
  return "openai";
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const THEMATIC_SYSTEM = `You are a qualitative data analysis expert specializing in thematic coding.
Given a research text excerpt, identify 1–4 meaningful thematic codes.
Return ONLY valid JSON in this exact shape:
{ "codes": [{ "name": "Short Label", "rationale": "One concise sentence." }] }
Requirements: code names must be 2–5 words in title case. No markdown, no commentary outside the JSON object.`;

// CHAT_SYSTEM removed — callers use t("chat.systemPrompt", lang) to get a localized prompt

// ─── Unified AI Call ──────────────────────────────────────────────────────────

export async function askAi(
  key: string,
  messages: Message[],
  systemPrompt: string,
  retryCount = 0
): Promise<string> {
  const provider = detectProvider(key);

  try {
    if (provider === "anthropic") {
      const res = await nativeHttp("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (res.status === 429 && retryCount < 1) {
        await new Promise(r => setTimeout(r, 2000));
        return askAi(key, messages, systemPrompt, retryCount + 1);
      }

      if (res.status < 200 || res.status >= 300) {
        const lang = useAppStore.getState().language;
        throw new Error(`${t("ai.error.anthropic", lang)} (HTTP ${res.status})`);
      }
      const data = JSON.parse(res.body) as { content?: { text: string }[] };
      return data.content?.[0]?.text ?? "";

    } else if (provider === "gemini") {
      const maxRetries = 3;
      let currentRetry = retryCount;
      let res;

      while (currentRetry <= maxRetries) {
        res = await nativeHttp(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              system_instruction: { parts: [{ text: systemPrompt }] },
              contents: messages.map((m) => ({
                role: m.role === "user" ? "user" : "model",
                parts: [{ text: m.content }],
              })),
            }),
          }
        );

        if (res.status === 429 && currentRetry < maxRetries) {
          const delay = 3000 * Math.pow(2, currentRetry);
          console.warn(`Gemini 429 received. Retrying in ${delay}ms (Attempt ${currentRetry + 1}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, delay));
          currentRetry++;
          continue;
        }
        break;
      }

      if (!res) throw new Error("Gemini API request failed to initiate.");

      if (res.status < 200 || res.status >= 300) {
        if (res.status === 429) {
          const lang = useAppStore.getState().language;
          throw new Error(`${t("ai.error.quotaExceeded", lang)} (API Quota Exceeded. Please check your Google AI Studio billing/limits.)`);
        }
        const lang = useAppStore.getState().language;
        throw new Error(`${t("ai.error.gemini", lang)} (HTTP ${res.status})`);
      }

      let data;
      try {
        data = JSON.parse(res.body);
      } catch {
        const lang = useAppStore.getState().language;
        throw new Error(`${t("ai.error.gemini", lang)}: Invalid JSON.`);
      }

      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        const lang = useAppStore.getState().language;
        throw new Error(`${t("ai.error.invalidGeminiFormat", lang)}: ${res.body.substring(0, 100)}...`);
      }

      return candidateText;

    } else {
      const res = await nativeHttp("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.5,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });

      if (res.status === 429 && retryCount < 1) {
        await new Promise(r => setTimeout(r, 2000));
        return askAi(key, messages, systemPrompt, retryCount + 1);
      }

      if (res.status < 200 || res.status >= 300) {
        const lang = useAppStore.getState().language;
        throw new Error(`${t("ai.error.openai", lang)} (HTTP ${res.status})`);
      }
      const data = JSON.parse(res.body) as { choices: { message: { content: string } }[] };
      return data.choices[0].message.content;
    }
  } catch (err) {
    if (retryCount < 1) {
      await new Promise(r => setTimeout(r, 2000));
      return askAi(key, messages, systemPrompt, retryCount + 1);
    }
    throw err;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function analyzeThematicCodes(
  key: string,
  text: string
): Promise<ThematicResult> {
  const messages: Message[] = [{ role: "user", content: `Analyze this excerpt:\n\n"${text}"` }];
  const raw = await askAi(key, messages, THEMATIC_SYSTEM);
  try {
    return JSON.parse(raw) as ThematicResult;
  } catch {
    console.error("Failed to parse thematic analysis result:", raw);
    const lang = useAppStore.getState().language;
    throw new Error(t("ai.error.invalidFormat", lang));
  }
}
