import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorPalette = {
    id: string;
    name: string;
    colors: string[];
};

export const PALETTES: ColorPalette[] = [
    {
        id: "original",
        name: "Orijinal Renkler",
        colors: [],
    },
    {
        id: "modern",
        name: "Modern (Vibrant)",
        colors: ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"],
    },
    {
        id: "pastel",
        name: "Pastel",
        colors: ["#93c5fd", "#fca5a5", "#86efac", "#fde047", "#c4b5fd", "#f9a8d4", "#67e8f9"],
    },
    {
        id: "monochrome",
        name: "Siyah - Beyaz",
        colors: ["#ffffff", "#e5e7eb", "#9ca3af", "#4b5563", "#1f2937", "#111827", "#374151"],
    },
    {
        id: "grayscale",
        name: "Gri Tonları",
        colors: ["#f3f4f6", "#d1d5db", "#9ca3af", "#6b7280", "#4b5563", "#374151", "#1f2937"],
    },
    {
        id: "midnight",
        name: "Midnight",
        colors: ["#2dd4bf", "#f43f5e", "#8b5cf6", "#fbbf24", "#3b82f6", "#10b981", "#6366f1"],
    },
    {
        id: "high-contrast",
        name: "Yüksek Kontrast",
        colors: ["#ffff00", "#ff00ff", "#00ffff", "#ff0000", "#00ff00", "#0000ff", "#ffffff"],
    },
];

interface VisualThemeStore {
    activePaletteId: string;
    getColors: () => string[];
    setPalette: (id: string) => void;
    getActivePalette: () => ColorPalette;
    getCodeColor: (index: number, originalColor?: string) => string;
}

export const useVisualThemeStore = create<VisualThemeStore>()(
    persist(
        (set, get) => ({
            activePaletteId: "modern",
            getColors: () => {
                const p = PALETTES.find((p) => p.id === get().activePaletteId);
                return p?.colors ?? PALETTES[0].colors;
            },
            setPalette: (id) => set({ activePaletteId: id }),
            getActivePalette: () => {
                return PALETTES.find((p) => p.id === get().activePaletteId) ?? PALETTES[0];
            },
            getCodeColor: (index: number, originalColor?: string) => {
                const colors = get().getColors();
                if (get().activePaletteId === "original" && originalColor) return originalColor;
                return colors[index % colors.length];
            }
        }),
        { name: "qo-visual-theme" }
    )
);
