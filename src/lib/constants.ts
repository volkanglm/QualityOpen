// Code palette - pastel tones aligned with design system
export const CODE_COLORS = [
  "#a78bfa", // violet
  "#6ee7b7", // emerald
  "#fca5a5", // rose
  "#93c5fd", // blue
  "#fcd34d", // amber
  "#f9a8d4", // pink
  "#86efac", // green
  "#7dd3fc", // sky
  "#c4b5fd", // light violet
  "#a5f3fc", // cyan
  "#fed7aa", // orange
  "#bbf7d0", // light green
] as const;

export const APP_NAME = "QualityOpen";
export const APP_VERSION = "1.3.8";

export const NAV_ITEMS = [
  { id: "documents", label: "Documents", icon: "FileText" },
  { id: "coding", label: "Coding", icon: "Tag" },
  { id: "analysis", label: "Analysis", icon: "BarChart2" },
  { id: "memos", label: "Memos", icon: "BookOpen" },
  { id: "settings", label: "Settings", icon: "Settings" },
] as const;
