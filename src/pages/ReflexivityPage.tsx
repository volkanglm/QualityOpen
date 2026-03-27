import { useState, useMemo, useEffect } from "react";
import { BookOpen, FileUp, Plus, Trash2, Calendar, FileText } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { exportReflexivityAsText } from "@/lib/exportUtils";
import { cn } from "@/lib/utils";

export function ReflexivityPage() {
  const t = useT();
  const { activeProjectId } = useAppStore();
  const { reflexivityEntries, addReflexivityEntry, updateReflexivityEntry, deleteReflexivityEntry, projects } = useProjectStore();

  const projectEntries = useMemo(
    () => reflexivityEntries.filter((e) => e.projectId === activeProjectId).sort((a, b) => b.date - a.date),
    [reflexivityEntries, activeProjectId]
  );
  const project = projects.find(p => p.id === activeProjectId);

  const [activeEntryId, setActiveEntryId] = useState<string | null>(projectEntries[0]?.id || null);
  const activeEntry = projectEntries.find((e) => e.id === activeEntryId);

  // Sync selection when project changes
  useEffect(() => {
    if (projectEntries.length > 0 && (!activeEntryId || !projectEntries.some(e => e.id === activeEntryId))) {
      setActiveEntryId(projectEntries[0].id);
    } else if (projectEntries.length === 0) {
      setActiveEntryId(null);
    }
  }, [projectEntries, activeEntryId]);

  const handleCreate = () => {
    if (!activeProjectId) return;
    const entry = addReflexivityEntry(activeProjectId, "");
    setActiveEntryId(entry.id);
  };

  const handleExport = () => {
    if (!projectEntries.length || !project) return;
    exportReflexivityAsText(projectEntries, project.name);
  };

  if (!activeProjectId) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8 text-center" style={{ background: "var(--bg-primary)" }}>
        <div className="max-w-md">
          <BookOpen className="mx-auto h-12 w-12 opacity-20 mb-4" />
          <h2 className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>{t("nav.reflexivity") || "Reflexivity Journal"}</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>Please open a project to access the Reflexivity Journal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "var(--bg-primary)" }}>
      {/* Left Sidebar for Journal Entries */}
      <div className="w-64 flex flex-col border-r flex-shrink-0" style={{ borderColor: "var(--border)", background: "var(--bg-secondary)" }}>
        <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" style={{ color: "var(--code-4)" /* Gold */ }} />
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
              Journal Entries
            </span>
          </div>
          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={handleCreate} title="New Entry">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {projectEntries.length === 0 ? (
            <div className="pt-8 text-center px-4">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>No entries yet.</p>
              <Button variant="outline" size="sm" className="mt-4 w-full" onClick={handleCreate}>
                Start Journaling
              </Button>
            </div>
          ) : (
            projectEntries.map((entry) => {
              const isActive = entry.id === activeEntryId;
              const title = entry.content.split("\n")[0]?.slice(0, 30) || "Untitled Entry";
              const dateStr = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(entry.date);
              
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-[var(--radius-sm)] flex flex-col gap-1 transition-colors group cursor-pointer",
                    isActive ? "bg-[var(--accent-subtle)]" : "hover:bg-[var(--surface-hover)]"
                  )}
                  onClick={() => setActiveEntryId(entry.id)}
                >
                  <span className={cn("text-xs font-medium truncate", isActive ? "text-[var(--accent)]" : "text-[var(--text-primary)]")}>
                    {title}
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                      <Calendar className="h-3 w-3" />
                      {dateStr}
                    </span>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-black/10 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteReflexivityEntry(entry.id);
                      }}
                    >
                      <Trash2 className="h-3 w-3 hover:text-red-500" style={{ color: "var(--text-disabled)" }} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden" style={{ background: "var(--bg-primary)" }}>
        {/* Top bar */}
        <div className="h-12 border-b flex items-center justify-between px-6" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Reflexivity Journal</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={projectEntries.length === 0}>
            <FileText className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Export for APA Method Section</span>
          </Button>
        </div>

        {/* Distraction-free Editor */}
        <div className="flex-1 overflow-y-auto relative">
          {activeEntry ? (
            <textarea
              key={activeEntry.id}
              defaultValue={activeEntry.content}
              onChange={(e) => updateReflexivityEntry(activeEntry.id, e.target.value)}
              placeholder="Record your thoughts, biases, and role in the qualitative research process here. This journal helps establish methodological integrity."
              className="w-full h-full p-12 text-sm leading-relaxed outline-none resize-none bg-transparent"
              style={{
                color: "var(--text-primary)",
                fontFamily: '"Charter", "Georgia", "Times New Roman", serif',
                fontSize: "16px",
                lineHeight: "1.90",
                maxWidth: "76ch",
                margin: "0 auto",
                display: "block"
              }}
              spellCheck={false}
            />
          ) : (
             <div className="flex h-full items-center justify-center pointer-events-none opacity-40">
               <FileUp className="h-10 w-10 mb-4 mx-auto" style={{ color: "var(--text-muted)" }} />
               <p className="text-sm" style={{ color: "var(--text-muted)" }}>Select or create an entry.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
