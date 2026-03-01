import type { Code } from "@/types";

export interface FlatCode extends Code {
    depth: number;
}

/** Flatten a recursive code tree into a sorted linear list for UI rendering. */
export function flattenCodes(
    codes: Code[],
    parentId: string | undefined,
    depth: number,
    collapsed: Set<string> = new Set(),
    visited: Set<string> = new Set(),
): FlatCode[] {
    if (depth > 12) return []; // Guard against circular refs or extreme nesting

    return codes
        .filter((c) => (parentId === undefined ? !c.parentId : c.parentId === parentId))
        .flatMap((code) => {
            if (visited.has(code.id)) return []; // Circular ref guard
            const nextVisited = new Set(visited).add(code.id);

            return [
                { ...code, depth },
                ...(collapsed.has(code.id)
                    ? []
                    : flattenCodes(codes, code.id, depth + 1, collapsed, nextVisited)),
            ];
        });
}

/** 
 * Calculate recursive usage counts for codes.
 * Returns a map of codeId -> (own count + children counts).
 */
export function calculateHierarchicalCounts(
    codes: Code[],
    segmentsCountMap: Map<string, number>
): Map<string, number> {
    const result = new Map<string, number>();

    function getCount(codeId: string): number {
        if (result.has(codeId)) return result.get(codeId)!;

        const ownCount = segmentsCountMap.get(codeId) || 0;
        const childrenCount = codes
            .filter((c) => c.parentId === codeId)
            .reduce((sum, child) => sum + getCount(child.id), 0);

        const total = ownCount + childrenCount;
        result.set(codeId, total);
        return total;
    }

    codes.forEach((c) => getCount(c.id));
    return result;
}
