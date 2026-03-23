import { useMemo, useState } from "react";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import type { Code } from "@/types";
import { Download, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { askAi } from "@/lib/ai";
import { useLicenseStore } from "@/store/license.store";
import { useSettingsStore } from "@/store/settings.store";
export function QmarsTable({ codes }: { codes: Code[] }) {
    const { documents, segments, syntheses, upsertSynthesis } = useProjectStore();
    const { activeProjectId } = useAppStore();
    const { getActiveKey } = useSettingsStore();

    const [generatingId, setGeneratingId] = useState<string | null>(null);

    // Calculate study counts for each code
    const tableData = useMemo(() => {
        return codes.map(code => {
            const codeSegments = segments.filter(s => s.codeIds.includes(code.id));
            const distinctStudies = new Set(codeSegments.map(s => s.documentId));
            const synthesisObj = syntheses.find(s => s.codeId === code.id && s.propertyKey === "qmars");
            
            return {
                code,
                studyCount: distinctStudies.size,
                segments: codeSegments,
                synthesis: synthesisObj?.content || "",
            };
        }).sort((a,b) => b.studyCount - a.studyCount);
    }, [codes, segments, syntheses]);

    const handleGenerateSynthesis = async (code: Code, codeSegments: typeof segments) => {
        const { isPro, openModal } = useLicenseStore.getState();
        if (!isPro) {
            openModal();
            return;
        }

        const key = getActiveKey();
        if (!key || !activeProjectId) return;

        if (codeSegments.length === 0) return;

        setGeneratingId(code.id);

        try {
            const contextText = codeSegments.map(s => {
                const docName = documents.find(d => d.id === s.documentId)?.name || 'Unknown Study';
                return `- [${docName}]: "${s.text}"`;
            }).join("\n");

            const systemPrompt = `Sen APA JARS QMARS (Qualitative Meta-Analysis Reporting Standards) standartlarına hakim bir uzmansın.
Görevin: Aşağıda "${code.name}" teması altında farklı birincil araştırmalardan (çalışmalardan) elde edilen bulgular verilmiştir.
Bu bulguları sentezleyerek üst düzey (meta-level) bir açıklama yaz. Bu açıklama, alıntıların ortak noktalarını, farklılıklarını ve genel temayı özetlemelidir.
Sentez metni kısa, öz ve akademik dilde olmalıdır (3-5 cümle). Doğrudan sentez metnine başla.`;

            const reply = await askAi(key, [{ role: "user", content: `Lütfen şu bulguları sentezle:\n\n${contextText}` }], systemPrompt);

            upsertSynthesis({
                projectId: activeProjectId,
                codeId: code.id,
                propertyKey: "qmars",
                propertyValue: "synthesis",
                content: reply
            });
        } catch (err) {
            console.error("AI Synthesis failed:", err);
        } finally {
            setGeneratingId(null);
        }
    };

    const handleExportQmars = () => {
        // Build HTML table for export
        let htmlContent = `
        <!DOCTYPE html>
        <html lang="tr">
        <head>
            <meta charset="UTF-8">
            <title>QMARS Sentez Tablosu</title>
            <style>
                body { font-family: "Georgia", serif; line-height: 1.6; color: #333; max-width: 1000px; margin: 40px auto; padding: 20px; }
                h1 { font-size: 24px; border-bottom: 2px solid #ddd; padding-bottom: 10px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ccc; padding: 12px; text-align: left; vertical-align: top; }
                th { background-color: #f9f9f9; font-weight: bold; }
                .study-count { text-align: center; font-weight: bold; }
            </style>
        </head>
        <body>
            <h1>Nitel Meta-Sentez (QMARS) Tema Sentez Tablosu</h1>
            <p>Bu tablo APA JARS standartlarına uygun olarak meta-sentez bulgularını özetlemektedir.</p>
            <table>
                <thead>
                    <tr>
                        <th style="width: 20%;">Tema (Kod)</th>
                        <th style="width: 15%;">Birincil Çalışma Sayısı (k)</th>
                        <th style="width: 65%;">Sentezlenmiş Bulgu (Synthesized Finding)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        tableData.forEach(row => {
            htmlContent += `
                <tr>
                    <td><strong>${row.code.name}</strong></td>
                    <td class="study-count">${row.studyCount}</td>
                    <td>${row.synthesis ? row.synthesis.replace(/\n/g, "<br/>") : "<em>Henüz sentezlenmedi.</em>"}</td>
                </tr>
            `;
        });

        htmlContent += `
                </tbody>
            </table>
        </body>
        </html>
        `;

        const blob = new Blob([htmlContent], { type: "text/html" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `QMARS_Synthesis_Table.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    };

    return (
        <div className="flex flex-col h-full gap-6">
            <div className="flex items-center justify-between bg-[var(--bg-secondary)]/40 p-4 rounded-xl border border-[var(--border)]">
                <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">QMARS Sentez Tablosu</h2>
                    <p className="text-[11px] text-[var(--text-muted)] mt-1">Nitel meta-sentez çalışmaları için tema bazlı bulgu sentezi.</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2 h-8 text-[11px]" onClick={handleExportQmars}>
                        <Download className="h-3.5 w-3.5" />
                        Tabloyu İndir (HTML)
                    </Button>
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar bg-[var(--bg-secondary)]/20 border border-[var(--border)] rounded-xl">
                <table className="w-full text-left border-collapse text-sm">
                    <thead className="sticky top-0 bg-[var(--bg-secondary)] shadow-sm z-10">
                        <tr>
                            <th className="p-4 font-semibold text-[var(--text-secondary)] border-b border-[var(--border)] w-[20%]">Tema (Kod)</th>
                            <th className="p-4 font-semibold text-[var(--text-secondary)] border-b border-[var(--border)] w-[15%] text-center">Çalışma Sayısı (k)</th>
                            <th className="p-4 font-semibold text-[var(--text-secondary)] border-b border-[var(--border)] w-[65%]">
                                <div className="flex items-center justify-between">
                                    <span>Sentezlenmiş Bulgu (Synthesized Finding)</span>
                                </div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row) => (
                            <tr key={row.code.id} className="border-b border-[var(--border)]/50 hover:bg-[var(--surface-hover)] transition-colors">
                                <td className="p-4 align-top">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.code.color }} />
                                        <span className="font-bold text-[var(--text-primary)]">{row.code.name}</span>
                                    </div>
                                </td>
                                <td className="p-4 align-top text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-mono text-xs">
                                        {row.studyCount}
                                    </span>
                                </td>
                                <td className="p-4 align-top">
                                    <div className="flex flex-col gap-3">
                                        {row.synthesis ? (
                                            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{row.synthesis}</p>
                                        ) : (
                                            <p className="text-sm text-[var(--text-muted)] italic font-light">
                                                Bu tema için henüz meta-sentez oluşturulmadı.
                                            </p>
                                        )}
                                        <div className="mt-2">
                                            <Button 
                                                variant="ghost" 
                                                size="sm" 
                                                className="h-7 text-[10px] gap-1.5 font-semibold text-[var(--accent)] hover:bg-[var(--accent)]/10"
                                                onClick={() => handleGenerateSynthesis(row.code, row.segments)}
                                                disabled={generatingId === row.code.id || row.studyCount === 0}
                                            >
                                                {generatingId === row.code.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                {row.synthesis ? "Yeniden Sentezle (AI)" : "Sentez Oluştur (AI)"}
                                            </Button>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {tableData.length === 0 && (
                            <tr>
                                <td colSpan={3} className="p-8 text-center text-[var(--text-muted)]">
                                    Henüz kod oluşturulmamış.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
