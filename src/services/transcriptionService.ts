/**
 * transcriptionService.ts
 * Implements two-tiered transcription:
 * A) API-based (OpenAI Whisper)
 * B) Local parser (.SRT, .VTT)
 */

export interface TranscriptLine {
    id: string;
    start: number; // in seconds
    end: number;   // in seconds
    text: string;
}

function parseTimecodeToSeconds(tc: string): number {
    // Parses "HH:MM:SS,mmm" or "00:00:00.000" into float seconds
    const [time, ms] = tc.replace(",", ".").split(".");
    const parts = time.split(":");
    if (parts.length === 3) {
        const [h, m, s] = parts.map(Number);
        return h * 3600 + m * 60 + s + (Number("0." + ms) || 0);
    } else if (parts.length === 2) {
        const [m, s] = parts.map(Number);
        return m * 60 + s + (Number("0." + ms) || 0);
    }
    return Number(time) + (Number("0." + ms) || 0);
}

/**
 * Parses raw SRT/VTT file text into structured TranscriptLine array.
 */
export function parseSubtitleFile(content: string): TranscriptLine[] {
    const lines = content.replace(/\r\n/g, "\n").split("\n");
    const result: TranscriptLine[] = [];

    let i = 0;

    // Skip VTT header if present
    if (lines[0]?.includes("WEBVTT")) {
        i++;
        while (lines[i]?.trim() === "") i++;
    }

    while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) {
            i++;
            continue;
        }

        // Is it a timecode line?
        if (line.includes("-->")) {
            const [startStr, endStr] = line.split("-->").map(s => s.trim().split(" ")[0]); // split " " to ignore VTT styles
            const start = parseTimecodeToSeconds(startStr);
            const end = parseTimecodeToSeconds(endStr);

            i++;
            const textLines = [];
            while (i < lines.length && lines[i].trim() !== "") {
                textLines.push(lines[i].trim());
                i++;
            }

            result.push({
                id: crypto.randomUUID(),
                start,
                end,
                text: textLines.join(" ")
            });
        } else {
            // It might be an index number before timecode (SRT format)
            i++;
        }
    }

    return result;
}

/**
 * Sends a local file (converted to blob) to OpenAI's Whisper API using BYOK.
 * Requests timestamped segments.
 */
export async function transcribeWithWhisper(
    apiKey: string,
    file: File,
    language?: string
): Promise<TranscriptLine[]> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("response_format", "verbose_json");
    formData.append("timestamp_granularities[]", "segment");
    if (language) {
        formData.append("language", language);
    }

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`
        },
        body: formData
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || `Whisper API Error: ${res.statusText}`);
    }

    const data = await res.json();

    if (!data.segments || !Array.isArray(data.segments)) {
        throw new Error("Invalid response format from Whisper API.");
    }

    return data.segments.map((seg: { start: number; end: number; text: string }) => ({
        id: crypto.randomUUID(),
        start: seg.start,
        end: seg.end,
        text: seg.text.trim()
    }));
}
