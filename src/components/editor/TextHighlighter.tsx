import { motion } from "framer-motion";
import type { Segment, Code } from "@/types";

interface TextHighlighterProps {
  content: string;
  segments: Segment[];
  codes: Code[];
}

interface Span {
  start: number;
  end: number;
  segment: Segment;
}

/**
 * Renders plain text with colored highlight spans for each coded segment.
 * Overlapping segments are merged left-to-right (first wins).
 * New segments fade in smoothly via motion.mark.
 */
export function TextHighlighter({ content, segments, codes }: TextHighlighterProps) {
  if (!content) return null;

  // Sort valid segments by start position
  const spans: Span[] = segments
    .filter((s) => s.start >= 0 && s.end > s.start && s.end <= content.length)
    .map((s) => ({ start: s.start, end: s.end, segment: s }))
    .sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const span of spans) {
    const { start, end, segment } = span;

    // Skip segments that start before the current cursor (overlap / already covered)
    if (start < cursor) continue;

    // Plain text before this segment
    if (start > cursor) {
      parts.push(
        <span key={`plain-${cursor}`}>{content.slice(cursor, start)}</span>
      );
    }

    // Determine highlight color
    let color: string;
    if (segment.isHighlight) {
      color = segment.highlightColor ?? "#fcd34d";
    } else {
      const firstCode = codes.find((c) => segment.codeIds.includes(c.id));
      color = firstCode?.color ?? "#a78bfa";
    }

    // Coded / highlighted segment — fades in when first created
    parts.push(
      <motion.mark
        key={`seg-${segment.id}`}
        data-segment-id={segment.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{
          background:    `${color}28`,
          borderBottom:  `2px solid ${color}`,
          borderRadius:  "2px 2px 0 0",
          paddingBottom: "1px",
          color:         "inherit",
        }}
        title={
          segment.isHighlight
            ? "Highlight"
            : codes
                .filter((c) => segment.codeIds.includes(c.id))
                .map((c) => c.name)
                .join(", ")
        }
      >
        {content.slice(start, end)}
      </motion.mark>
    );

    cursor = end;
  }

  // Remaining plain text
  if (cursor < content.length) {
    parts.push(
      <span key="plain-end">{content.slice(cursor)}</span>
    );
  }

  return <>{parts}</>;
}
