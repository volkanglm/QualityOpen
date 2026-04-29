import { useState, useMemo, useEffect } from "react";
import { Sparkles, ChevronRight, MoreHorizontal, Edit3, Wand2, Search, Loader2 } from "lucide-react";
import { SegmentDrawer } from "./SegmentDrawer";
import { askAi } from "@/lib/ai";
import { useAppStore } from "@/store/app.store";
import { useSettingsStore } from "@/store/settings.store";
import { useProjectStore } from "@/store/project.store";
import { useT } from "@/hooks/useT";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { Code, Synthesis } from "@/types";

export function SynthesisGrid({ codes }: { codes: Code[] }) {
    const t = useT();
    const { documents, segments, syntheses, upsertSynthesis } = useProjectStore();
    const { activeProjectId } = useAppStore();
    const { getActiveKey } = useSettingsStore();

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerContext, setDrawerContext] = useState<{ code: Code; key?: string; val?: string } | null>(null);

    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // 1. Identify all available properties across documents
    const allProperties = useMemo(() => {
        const props = new Set<string>();
        documents.forEach(doc => {
            if (doc.properties) {
                Object.keys(doc.properties).forEach(k => props.add(k));
            }
        });
        return Array.from(props);
    }, [documents]);

    const [selectedProperty, setSelectedProperty] = useState<string | null>(allProperties[0] || null);

    // 2. Values for the selected property
    const propertyValues = useMemo(() => {
        if (!selectedProperty) return [];
        const vals = new Set<string>();
        documents.forEach((doc) => {
            if (doc.properties?.[selectedProperty]) {
                vals.add(doc.properties[selectedProperty]);
            }
        });
        return Array.from(vals).sort();
    }, [documents, selectedProperty]);

    const handleGenerateAi = async (code: Code, propertyKey?: string, propertyValue?: string) => {
        const key = getActiveKey();
        if (!key || !activeProjectId) return;

        // 1. Get relevant segments
        const cellSegments = segments.filter(seg => {
            const hasCode = seg.codeIds.includes(code.id);
            if (!hasCode) return false;
            if (!propertyKey || !propertyValue) return true;
            const doc = documents.find(d => d.id === seg.documentId);
            return doc?.properties?.[propertyKey] === propertyValue;
        });

        if (cellSegments.length === 0) return;

        const cellId = `${code.id}-${propertyKey || "all"}-${propertyValue || "all"}`;
        setGeneratingId(cellId);

        try {
            const contextText = cellSegments.map(s => `- "${s.text}"`).join("\n");
            const systemPrompt = `Sen nitel araştırma verisi analizi konusunda uzman bir yardımcısın.
Aşağıda belirli bir kod ("${code.name}")${propertyKey ? ` ve belirli bir değişken grubu ("${propertyKey}: ${propertyValue}")` : ""} altında toplanmış alıntıları verilmiştir.
Görevin: Bu alıntıları sentezleyerek, araştırmacının raporunda doğrudan kullanabileceği, analitik, öz ve akıcı bir parantez içi özet (3-5 cümle) yazmaktır. 
Dilin akademik ve profesyonel olmalı. Metne doğrudan başla, giriş cümlesi (örn. "İşte özet:") kullanma.`;

            const reply = await askAi(key, [{ role: "user", content: `Lütfen şu alıntıları sentezle:\n\n${contextText}` }], systemPrompt);

            upsertSynthesis({
                projectId: activeProjectId,
                codeId: code.id,
                propertyKey,
                propertyValue,
                content: reply
            });
        } catch (err) {
            console.error("AI Synthesis failed:", err);
        } finally {
            setGeneratingId(null);
        }
    };

    const openDrawer = (code: Code, key?: string, val?: string) => {
        setDrawerContext({ code, key, val });
        setDrawerOpen(true);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            {/* Configuration Header */}
            <div className="flex items-center justify-between bg-[var(--bg-secondary)]/40 p-4 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {t("synthesis.variables")}:
                        </span>
                        <select
                            value={selectedProperty || ""}
                            onChange={(e) => setSelectedProperty(e.target.value || null)}
                            className="bg-[var(--surface)] text-[var(--text-primary)] border border-[var(--border)] rounded-md px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                        >
                            <option value="">-- {t("retrieval.none")} --</option>
                            {allProperties.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-[11px]">
                        <Sparkles className="h-3.5 w-3.5" />
                        {t("synthesis.generate")}
                    </Button>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                {!selectedProperty ? (
                    <div className="grid grid-cols-1 gap-4">
                        {codes.map(code => (
                            <SynthesisCard
                                key={code.id}
                                code={code}
                                synthesis={syntheses.find(s => s.codeId === code.id && !s.propertyKey)}
                                onGenerate={() => handleGenerateAi(code)}
                                isGenerating={generatingId === `${code.id}-all-all`}
                                onViewSegments={() => openDrawer(code)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col gap-8">
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] px-2 flex items-center gap-2">
                            <ChevronRight className="h-4 w-4" />
                            {t("synthesis.crossTab")}: {selectedProperty}
                        </h3>
                        <div className="grid grid-cols-1 gap-8">
                            {codes.map(code => (
                                <div key={code.id} className="space-y-4">
                                    <div className="flex items-center gap-2 px-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: code.color }} />
                                        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">{code.name}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {/* Generative Cell for "All Documents" if needed, but here we focus on values */}
                                        {propertyValues.map(val => (
                                            <SynthesisCard
                                                key={`${code.id}-${val}`}
                                                code={code}
                                                propertyKey={selectedProperty}
                                                propertyValue={val}
                                                synthesis={syntheses.find(s =>
                                                    s.codeId === code.id &&
                                                    s.propertyKey === selectedProperty &&
                                                    s.propertyValue === val
                                                )}
                                                onGenerate={() => handleGenerateAi(code, selectedProperty, val)}
                                                isGenerating={generatingId === `${code.id}-${selectedProperty}-${val}`}
                                                onViewSegments={() => openDrawer(code, selectedProperty, val)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {drawerContext && (
                <SegmentDrawer
                    isOpen={drawerOpen}
                    onClose={() => setDrawerOpen(false)}
                    code={drawerContext.code}
                    propertyKey={drawerContext.key}
                    propertyValue={drawerContext.val}
                />
            )}
        </div>
    );
}

function SynthesisCard({
    code,
    propertyKey,
    propertyValue,
    synthesis,
    onGenerate,
    isGenerating,
    onViewSegments
}: {
    code: Code;
    propertyKey?: string;
    propertyValue?: string;
    synthesis?: Synthesis;
    onGenerate: () => void;
    isGenerating: boolean;
    onViewSegments: () => void;
}) {
    const t = useT();
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(synthesis?.content || "");
    const { upsertSynthesis } = useProjectStore();
    const { activeProjectId } = useAppStore();

    useEffect(() => {
        setContent(synthesis?.content || "");
    }, [synthesis]);

    const handleSave = () => {
        if (!activeProjectId) return;
        if (content === synthesis?.content) {
            setIsEditing(false);
            return;
        }
        upsertSynthesis({
            projectId: activeProjectId,
            codeId: code.id,
            propertyKey,
            propertyValue,
            content
        });
        setIsEditing(false);
    };

    return (
        <div
            className="bg-[var(--bg-secondary)]/40 border border-[var(--border)] rounded-xl overflow-hidden flex flex-col group/card hover:border-[var(--border-strong)] transition-all cursor-default"
            onDoubleClick={onViewSegments}
        >
            <div className="px-4 py-2 border-b border-[var(--border)]/50 flex items-center justify-between bg-[var(--surface)]/30">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] truncate max-w-[150px]">
                    {propertyValue || t("synthesis.allDocs")}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                        <Edit3 className="h-3 w-3" />
                    </button>
                    <button className="p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                        <MoreHorizontal className="h-3 w-3" />
                    </button>
                </div>
            </div>

            <div className="p-4 flex-1 flex flex-col gap-3 min-h-[120px]">
                {isEditing ? (
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onBlur={handleSave}
                        autoFocus
                        className="flex-1 bg-transparent text-xs leading-relaxed resize-none focus:outline-none custom-scrollbar"
                        placeholder="Analiz özetini buraya yazın veya AI ile oluşturun..."
                    />
                ) : (
                    <div
                        className="flex-1 text-xs leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap cursor-pointer"
                        onClick={() => setIsEditing(true)}
                    >
                        {content || (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-disabled)] italic font-light">
                                {isGenerating ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                                ) : (
                                    <Wand2 className="h-4 w-4 opacity-50" />
                                )}
                                <span>{isGenerating ? t("synthesis.generating") : t("synthesis.empty")}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="px-4 py-2 bg-[var(--bg-tertiary)]/30 flex items-center justify-between border-t border-[var(--border)]/30">
                <button
                    onClick={onViewSegments}
                    className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <Search className="h-3 w-3" />
                    {t("synthesis.segmentsInHCELL")}
                </button>
                <button
                    className={cn(
                        "text-[10px] font-semibold text-[var(--accent)] hover:underline flex items-center gap-1",
                        isGenerating && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={(e) => {
                        e.stopPropagation();
                        onGenerate();
                    }}
                    disabled={isGenerating}
                >
                    {isGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    AI
                </button>
            </div>
        </div>
    );
}
