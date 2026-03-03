/**
 * QualityOpen Academic Color Palette System
 * Provides named, accessible palettes for charts and network maps.
 */

export type PaletteId = "qualityopen" | "okabe-ito" | "monochrome";

export interface ColorPalette {
    id: PaletteId;
    name: string;
    description: string;
    colors: string[];
}

/** QualityOpen default — Tailwind zinc/stone warm pastels */
const QUALITYOPEN: ColorPalette = {
    id: "qualityopen",
    name: "QualityOpen Default",
    description: "Warm zinc & stone pastel tones",
    colors: [
        "#a1a1aa", // zinc-400
        "#78716c", // stone-500
        "#6d6d80", // slate-ish
        "#9f9fa8", // zinc-400 variant
        "#b4b4c0",
        "#d4d4d8", // zinc-300
        "#e4e4e7", // zinc-200
        "#71717a", // zinc-500
        "#52525b", // zinc-600
        "#3f3f46", // zinc-700
        "#a89984", // warm stone
        "#c4b5a0", // stone-300 warm
    ],
};

/**
 * Okabe-Ito palette — scientifically validated, color-blind safe (8+1 colors).
 * https://jfly.uni-koeln.de/color/
 */
const OKABE_ITO: ColorPalette = {
    id: "okabe-ito",
    name: "Okabe-Ito (Color-Blind safe)",
    description: "Universally distinguishable; recommended for academic publication",
    colors: [
        "#E69F00", // orange
        "#56B4E9", // sky blue
        "#009E73", // bluish green
        "#F0E442", // yellow
        "#0072B2", // blue
        "#D55E00", // vermillion
        "#CC79A7", // reddish purple
        "#000000", // black
        "#999999", // grey
    ],
};

/** Monochrome — shades of a single neutral for minimal / print contexts */
const MONOCHROME: ColorPalette = {
    id: "monochrome",
    name: "Monochrome",
    description: "Greyscale tones for print or minimal UI",
    colors: [
        "#1a1a1a",
        "#2d2d2d",
        "#404040",
        "#555555",
        "#6b6b6b",
        "#808080",
        "#999999",
        "#b2b2b2",
        "#cccccc",
        "#e0e0e0",
        "#f2f2f2",
    ],
};

export const COLOR_PALETTES: Record<PaletteId, ColorPalette> = {
    "qualityopen": QUALITYOPEN,
    "okabe-ito": OKABE_ITO,
    "monochrome": MONOCHROME,
};

export const DEFAULT_PALETTE: PaletteId = "qualityopen";

/**
 * Get an array of colors from the specified palette.
 * If index exceeds palette length, it wraps around.
 */
export function getPaletteColors(paletteId: PaletteId = DEFAULT_PALETTE): string[] {
    return COLOR_PALETTES[paletteId]?.colors ?? QUALITYOPEN.colors;
}

/**
 * Get a single color by index, cycling through the palette if needed.
 */
export function getColorAt(index: number, paletteId: PaletteId = DEFAULT_PALETTE): string {
    const colors = getPaletteColors(paletteId);
    return colors[index % colors.length];
}
