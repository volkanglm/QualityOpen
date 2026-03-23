import { motion, AnimatePresence } from "framer-motion";
import { History, X, Tag, Plus, Pencil, Trash2, ArrowRight } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CodeEvolutionDrawer({ open, onClose }: Props) {
  const { activeProjectId } = useAppStore();
  const { auditLog, codes } = useProjectStore();

  const projectLogs = auditLog
    .filter((log) => log.projectId === activeProjectId)
    .sort((a, b) => b.timestamp - a.timestamp);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "CREATE_CODE": return <Plus className="h-4 w-4" style={{ color: "var(--code-1)" }} />;
      case "UPDATE_CODE": return <Pencil className="h-4 w-4" style={{ color: "var(--code-4)" }} />;
      case "DELETE_CODE": return <Trash2 className="h-4 w-4" style={{ color: "var(--danger)" }} />;
      case "MOVE_CODE": return <ArrowRight className="h-4 w-4" style={{ color: "var(--code-3)" }} />;
      default: return <Tag className="h-4 w-4" style={{ color: "var(--text-muted)" }} />;
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case "CREATE_CODE": return "Created Code";
      case "UPDATE_CODE": return "Updated Code";
      case "DELETE_CODE": return "Deleted Code";
      case "MOVE_CODE": return "Moved Code";
      default: return action;
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1000]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 bottom-0 right-0 w-[400px] z-[1001] flex flex-col shadow-2xl border-l"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border-subtle)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-2">
                <History className="h-5 w-5" style={{ color: "var(--text-secondary)" }} />
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Code Evolution Log</h2>
                  <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>Audit trail of your analysis structure</p>
                </div>
              </div>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5">
              {!activeProjectId ? (
                <p className="text-xs text-center mt-10" style={{ color: "var(--text-muted)" }}>No active project.</p>
              ) : projectLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center mt-12">
                  <Tag className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>No logs yet</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>Start creating and modifying codes to see their evolution.</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute top-4 bottom-4 left-4 w-px bg-white/10" style={{ background: "var(--border-subtle)" }} />
                  
                  <div className="space-y-6">
                    {projectLogs.map((log) => {
                      const code = log.targetId ? codes.find(c => c.id === log.targetId) : null;
                      const dateStr = new Intl.DateTimeFormat(undefined, { 
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                      }).format(log.timestamp);

                      return (
                        <div key={log.id} className="relative flex gap-4 pl-1">
                          {/* Timeline node */}
                          <div className="mt-0.5 relative z-10 w-6 h-6 rounded-full flex items-center justify-center bg-[var(--surface)] ring-4 ring-[var(--bg-primary)] border border-[var(--border)]">
                            {getActionIcon(log.action)}
                          </div>
                          
                          {/* Log card */}
                          <div className="flex-1 bg-[var(--surface)] border rounded-[var(--radius-md)] p-3" style={{ borderColor: "var(--border-subtle)" }}>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-primary)" }}>
                                {getActionName(log.action)}
                              </span>
                              <span className="text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
                                {dateStr}
                              </span>
                            </div>
                            
                            {/* Code Name if still exists, or detail hint */}
                            {log.action !== "DELETE_CODE" && (
                               <p className="text-[13px] font-medium mb-1" style={{ color: "var(--text-primary)" }}>
                                 {code ? code.name : "Code not found"}
                               </p>
                            )}

                            {/* Detailed explanation */}
                            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                              {log.details}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
