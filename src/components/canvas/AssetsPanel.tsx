import { useState, useMemo } from "react";
import { useLicenseStore } from "@/store/license.store";
import { useToastStore } from "@/store/toast.store";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Hash, Quote, Search, ChevronRight, ChevronLeft } from "lucide-react";

interface AssetsPanelProps {
  className?: string;
}

export function AssetsPanel({ className }: AssetsPanelProps) {
  const t = useT();
  const { codes, segments, documents, conceptMaps } = useProjectStore();
  const { activeProjectId } = useAppStore();
  const [activeTab, setActiveTab] = useState<"codes" | "quotes">("codes");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);

  const { isPro, openModal } = useLicenseStore();
  const pushToast = useToastStore((s) => s.push);

  const currentMap = useMemo(() => {
    return conceptMaps.find((m) => m.projectId === activeProjectId);
  }, [conceptMaps, activeProjectId]);

  const nodeCount = currentMap?.nodes?.length || 0;

  const filteredCodes = useMemo(() => {
    return codes.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  }, [codes, search]);

  const filteredQuotes = useMemo(() => {
    return segments
      .filter((s) => s.text.toLowerCase().includes(search.toLowerCase()))
      .map((s) => ({
        ...s,
        docName: documents.find((d) => d.id === s.documentId)?.name || t("canvas.unknownDoc"),
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [segments, search, documents, t]);

  const onDragStart = (event: React.DragEvent, nodeType: string, data: any) => {
    // Check limit on drag start to prevent even dragging the 6th item
    if (!isPro && nodeCount >= 5) {
      event.preventDefault();
      openModal();
      pushToast(t("project.limit.mapNodeCount"), "error");
      return;
    }

    const payload = JSON.stringify({ nodeType, data });
    const dt = event.dataTransfer;
    dt.setData("text", payload);
    dt.setData("text/plain", payload);
    try {
      dt.setData("application/reactflow", payload);
    } catch (e) {}
    dt.effectAllowed = "move";
  };

  const onAdd = (nodeType: string, data: any) => {
    if (!isPro && nodeCount >= 5) {
      openModal();
      pushToast(t("project.limit.mapNodeCount"), "error");
      return;
    }

    const customEvent = new CustomEvent("manual-drop", { 
      detail: { 
        appData: JSON.stringify({ nodeType, data }), 
        clientX: window.innerWidth / 2, 
        clientY: window.innerHeight / 2 
      } 
    });
    window.dispatchEvent(customEvent);
  };

  if (collapsed) {
    return (
      <div className="flex h-full w-8 flex-col items-center border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] pt-4">
        <button 
          onClick={() => setCollapsed(false)}
          className="rounded-md p-1 hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-64 flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-2xl transition-all", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] p-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)]">
          {t("canvas.assets")}
        </span>
        <button 
          onClick={() => setCollapsed(true)}
          className="rounded-md p-1 hover:bg-[var(--surface-hover)] text-[var(--text-tertiary)]"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] p-1">
        <button
          onClick={() => setActiveTab("codes")}
          className={cn(
            "flex-1 rounded-md py-1.5 text-[11px] font-bold uppercase tracking-tight transition-all",
            activeTab === "codes" 
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" 
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          )}
        >
          {t("canvas.codes")}
        </button>
        <button
          onClick={() => setActiveTab("quotes")}
          className={cn(
            "flex-1 rounded-md py-1.5 text-[11px] font-bold uppercase tracking-tight transition-all",
            activeTab === "quotes" 
              ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm" 
              : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          )}
        >
          {t("canvas.quotes")}
        </button>
      </div>

      {/* Search */}
      <div className="relative p-3">
        <Search className="absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder={t("canvas.search")}
          className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-1.5 pl-8 pr-3 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Assets List */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
        {activeTab === "codes" ? (
          <div className="flex flex-col gap-1">
            {filteredCodes.map((code) => (
              <div
                key={code.id}
                draggable
                onDragStart={(e) => onDragStart(e, "code", { 
                  label: code.name, 
                  color: code.color, 
                  usageCount: code.usageCount 
                })}
                className="flex cursor-grab items-center gap-2 rounded-md p-2 hover:bg-[var(--surface-hover)] transition-colors active:cursor-grabbing group overflow-hidden"
              >
                <Hash className="h-3.5 w-3.5 pointer-events-none shrink-0" style={{ color: code.color }} />
                <span className="truncate text-xs text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] flex-1">
                  {code.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onAdd("code", { label: code.name, color: code.color, usageCount: code.usageCount }); }}
                  className="rounded-md p-1 hover:bg-[var(--accent-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all opacity-0 group-hover:opacity-100"
                  title={t("canvas.addToMap")}
                >
                  <ChevronLeft className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredQuotes.map((quote) => (
              <div
                key={quote.id}
                draggable
                onDragStart={(e) => onDragStart(e, "quote", { 
                  label: quote.text, 
                  docName: quote.docName 
                })}
                className="flex cursor-grab flex-col gap-1 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2 hover:border-[var(--border)] transition-all active:cursor-grabbing group overflow-hidden relative"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1 opacity-60 pointer-events-none">
                    <Quote className="h-3 w-3 text-[var(--accent)] pointer-events-none" />
                    <span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{quote.docName}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); onAdd("quote", { label: quote.text, docName: quote.docName }); }}
                    className="rounded-md p-1 hover:bg-[var(--accent-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent)] transition-all opacity-0 group-hover:opacity-100"
                    title={t("canvas.addToMap")}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </button>
                </div>
                <p className="line-clamp-3 text-[11px] italic text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] leading-snug">
                  "{quote.text}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
