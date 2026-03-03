import { useMemo } from "react";

interface LineNumbersProps {
    content: string;
    /** Show every Nth line (default: 5, set to 1 for every line) */
    every?: number;
}

/**
 * Renders faint line numbers in the left margin of the text reader.
 * Uses very subtle styling to avoid visual noise while aiding navigation.
 */
export function LineNumbers({ content, every = 5 }: LineNumbersProps) {
    const lineCount = useMemo(() => {
        if (!content) return 0;
        return content.split("\n").length;
    }, [content]);

    if (lineCount === 0) return null;

    const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
        <div
            className="flex-shrink-0 select-none pr-2 text-right"
            style={{ minWidth: 32, userSelect: "none" }}
            aria-hidden="true"
        >
            {lines.map((num) => (
                <div
                    key={num}
                    className="text-[10px] leading-[1.75] font-mono"
                    style={{
                        color: num % every === 0 || num === 1
                            ? "var(--text-disabled)"
                            : "transparent",
                        height: "1.75em", // Match PROSE_STYLE lineHeight
                    }}
                >
                    {num % every === 0 || num === 1 ? num : ""}
                </div>
            ))}
        </div>
    );
}
