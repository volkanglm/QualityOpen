import { useMemo } from "react";
import { motion } from "framer-motion";
import type { Segment, Code } from "@/types";

interface SearchHighlighterProps {
  content: string;
  segments: Segment[];
  codes: Code[];
  searchQuery: string;
  useRegex?: boolean;
  matchCase?: boolean;
  wholeWord?: boolean;
}

interface Span {
  start: number;
  end: number;
  type: "segment" | "search";
  segment?: Segment;
  color?: string;
}

/**
 * Renders plain text with:
 *   1. Colored underline spans for each coded segment
 *   2. Highlighted search matches (yellow bg)
 * Overlapping regions: segments take priority; search marks fill gaps.
 */
export function SearchHighlighter({
  content,
  segments,
  codes,
  searchQuery,
  useRegex = false,
  matchCase = false,
  wholeWord = false,
}: SearchHighlighterProps) {
  const parts = useMemo(() => {
    if (!content) return [];

    // Build sorted segment spans
    const segSpans: Span[] = segments
      .filter((s) => s.start >= 0 && s.end > s.start && s.end <= content.length)
      .map((s) => {
        let color: string;
        if (s.isHighlight) {
          color = s.highlightColor ?? "#fcd34d";
        } else {
          const firstCode = codes.find((c) => s.codeIds.includes(c.id));
          color = firstCode?.color ?? "#a78bfa";
        }
        return { start: s.start, end: s.end, type: "segment" as const, segment: s, color };
      })
      .sort((a, b) => a.start - b.start);

    // Build search spans (only in gaps between segments)
    const searchSpans: Span[] = [];
    if (searchQuery.trim()) {
      let regex: RegExp | null = null;
      try {
        let pattern = searchQuery;
        if (!useRegex) {
          pattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape regex
        }
        if (wholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        const flags = matchCase ? "g" : "gi";
        regex = new RegExp(pattern, flags);
      } catch { /* invalid regex — ignore */ }

      if (regex) {
        let m: RegExpExecArray | null;
        while ((m = regex.exec(content)) !== null) {
          searchSpans.push({
            start: m.index,
            end: m.index + m[0].length,
            type: "search",
          });
          if (m[0].length === 0) regex.lastIndex++;
        }
      }
    }

    // Merge all spans, deduplicate / handle overlaps
    const all = [...segSpans, ...searchSpans].sort((a, b) => a.start - b.start);
    const result: React.ReactNode[] = [];
    let cursor = 0;

    for (const span of all) {
      const { start, end } = span;
      if (start < cursor) continue;       // already covered
      if (start > cursor) {
        result.push(
          <span key={`plain-${cursor}`}>{content.slice(cursor, start)}</span>
        );
      }

      if (span.type === "segment") {
        const seg = span.segment!;
        result.push(
          <motion.mark
            key={`seg-${seg.id}`}
            data-segment-id={seg.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            title={
              seg.isHighlight
                ? seg.memo ?? "Highlight"
                : codes.filter((c) => seg.codeIds.includes(c.id)).map((c) => c.name).join(", ")
            }
            style={{
              background: `${span.color}35`,
              borderBottom: `2.5px solid ${span.color}`,
              borderRadius: "2px 2px 0 0",
              paddingBottom: "1px",
              paddingLeft: "1px",
              paddingRight: "1px",
              color: "inherit",
              cursor: "default",
            }}
          >
            {content.slice(start, end)}
          </motion.mark>
        );
      } else {
        result.push(
          <mark
            key={`search-${start}`}
            style={{
              background: "rgba(253,224,71,0.45)",
              borderRadius: "2px",
              color: "inherit",
              padding: "0 1px",
            }}
          >
            {content.slice(start, end)}
          </mark>
        );
      }

      cursor = end;
    }

    if (cursor < content.length) {
      result.push(<span key="plain-end">{content.slice(cursor)}</span>);
    }

    return result;
  }, [content, segments, codes, searchQuery, useRegex]);

  return <>{parts}</>;
}
