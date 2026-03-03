import { useMemo, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, YAxis, Tooltip, Cell, XAxis } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import { ChevronDown, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
    "#3b82f6", // blue-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#f59e0b", // amber-500
    "#10b981", // emerald-500
    "#6366f1", // indigo-500
];

export function DemographicDistribution() {
    const { documents } = useProjectStore();
    const { activeProjectId } = useAppStore();

    const [activeProperty, setActiveProperty] = useState<string | null>(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const projectDocs = useMemo(
        () => documents.filter((d) => d.projectId === activeProjectId),
        [documents, activeProjectId]
    );

    // Group and count properties
    const { properties, chartData } = useMemo(() => {
        const keys = new Set<string>();

        // 1. Find all available keys
        projectDocs.forEach(doc => {
            if (doc.properties) {
                Object.keys(doc.properties).forEach(k => keys.add(k));
            }
        });

        const propertyList = Array.from(keys).sort();

        // Auto-select first property if none selected
        const currentProp = activeProperty && propertyList.includes(activeProperty) ? activeProperty : propertyList[0] || null;

        if (!currentProp) return { properties: [], chartData: [] };

        // 2. Count values for the active property
        const counts: Record<string, number> = {};
        projectDocs.forEach(doc => {
            const val = doc.properties?.[currentProp];
            if (val) {
                counts[val] = (counts[val] || 0) + 1;
            }
        });

        // 3. Convert to chart format
        const data = Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count); // sort by frequency

        return { properties: propertyList, chartData: data };
    }, [projectDocs, activeProperty]);

    // Set default selection
    useMemo(() => {
        if (!activeProperty && properties.length > 0) {
            setActiveProperty(properties[0]);
        }
    }, [properties, activeProperty]);

    if (properties.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 text-center h-[240px] border border-dashed rounded-xl" style={{ borderColor: "var(--border-subtle)" }}>
                <BarChart2 className="h-8 w-8 mb-3 opacity-20" />
                <p className="text-[12px] font-medium" style={{ color: "var(--text-muted)" }}>Henüz Değişken Yok</p>
                <p className="text-[11px] mt-1 max-w-[200px]" style={{ color: "var(--text-disabled)" }}>
                    Sağ panelden belgelere özellik (Örn: Yaş, Şehir) eklediğinizde grafikler burada belirecektir.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[280px]">
            {/* Header Selector */}
            <div className="flex items-center justify-between mb-4 relative z-10">
                <h3 className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
                    Değişken Dağılımı
                </h3>

                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 h-7 px-3 rounded-md border text-[11px] font-medium hover:bg-[var(--surface-hover)] transition-colors"
                        style={{
                            background: "var(--surface)",
                            borderColor: "var(--border)",
                            color: "var(--text-primary)"
                        }}
                    >
                        {activeProperty}
                        <ChevronDown className="h-3 w-3 opacity-50" />
                    </button>

                    <AnimatePresence>
                        {dropdownOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                                <motion.div
                                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    className="absolute right-0 top-full mt-1 w-48 py-1 rounded-md border shadow-xl z-50"
                                    style={{ background: "var(--bg-tertiary)", borderColor: "var(--border)" }}
                                >
                                    {properties.map(p => (
                                        <button
                                            key={p}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 text-[11px] hover:bg-[var(--surface-hover)] transition-colors",
                                                activeProperty === p ? "text-[var(--accent)] font-medium bg-[var(--surface)]" : "text-[var(--text-primary)]"
                                            )}
                                            onClick={() => {
                                                setActiveProperty(p);
                                                setDropdownOpen(false);
                                            }}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0 relative group">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="horizontal" margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        {/* Invisible grid, no lines */}
                        <YAxis type="number" hide />
                        <XAxis
                            type="category"
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
                            dy={10}
                        />

                        <Tooltip
                            cursor={{ fill: "var(--surface)", opacity: 0.4 }}
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="px-3 py-1.5 rounded-md shadow-xl border bg-[var(--bg-tertiary)] border-[var(--border)]">
                                            <p className="text-[12px] font-bold text-white mb-0.5">{payload[0].payload.name}</p>
                                            <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">
                                                {payload[0].value} Belge
                                            </p>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />

                        <Bar
                            dataKey="count"
                            radius={[4, 4, 4, 4]}
                            barSize={32}
                            animationDuration={1200}
                            animationEasing="ease-out"
                        >
                            {chartData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                                    className="opacity-80 hover:opacity-100 transition-opacity duration-300"
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
