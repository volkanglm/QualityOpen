// ─── AI Types ───────────────────────────────────────────────────────────────

export interface Message {
  role:    "user" | "assistant";
  content: string;
}

export interface ThematicCode {
  name:      string;
  rationale: string;
}

export interface ThematicResult {
  codes: ThematicCode[];
}

// ─── Provider detection ───────────────────────────────────────────────────────

function detectProvider(key: string): "openai" | "anthropic" | "gemini" {
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza"))   return "gemini";
  return "openai";
}

// ─── System Prompts ───────────────────────────────────────────────────────────

const THEMATIC_SYSTEM = `You are a qualitative data analysis expert specializing in thematic coding.
Given a research text excerpt, identify 1–4 meaningful thematic codes.
Return ONLY valid JSON in this exact shape:
{ "codes": [{ "name": "Short Label", "rationale": "One concise sentence." }] }
Requirements: code names must be 2–5 words in title case. No markdown, no commentary outside the JSON object.`;

const CHAT_SYSTEM = `Sen nitel araştırma verisi analizi konusunda uzman bir yardımcısın.
Aşağıda araştırmacının çalıştığı belge ve kodlanmış segmentler verilmiştir.
Bu bağlamı kullanarak araştırmacının sorularını Türkçe olarak yanıtla.
Kısa, analitik ve akademik bir dil kullan.`;

// ─── Unified AI Call ──────────────────────────────────────────────────────────

export async function askAi(
  key: string,
  messages: Message[],
  systemPrompt: string = CHAT_SYSTEM
): Promise<string> {
  const provider = detectProvider(key);

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-3-5-haiku-latest",
        max_tokens: 1024,
        system:     systemPrompt,
        messages:   messages.map((m) => ({ role: m.role, content: m.content })),
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}`);
    const data = await res.json() as { content?: { text: string }[] };
    return data.content?.[0]?.text ?? "";

  } else if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: messages.map((m) => ({
            role:  m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
        }),
      }
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  } else {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model:       "gpt-4o-mini",
        temperature: 0.5,
        messages:    [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}`);
    const data = await res.json() as { choices: { message: { content: string } }[] };
    return data.choices[0].message.content;
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
  } catch (err) {
    console.error("Failed to parse thematic analysis result:", raw);
    throw new Error("AI yanıtı beklenen formatta değil.");
  }
}
