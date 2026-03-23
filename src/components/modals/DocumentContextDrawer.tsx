import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserCircle, X, Save, Database } from "lucide-react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface Props {
  open: boolean;
  onClose: () => void;
  documentId: string;
}

const PRIMARY_FIELDS = [
  { key: "Participant ID", label: "Participant ID" },
  { key: "Age", label: "Age" },
  { key: "Gender", label: "Gender" },
  { key: "Education", label: "Education Level" },
  { key: "Notes", label: "Context / Observation Notes", multiline: true },
];

const META_FIELDS = [
  { key: "Study Name", label: "Study Name / Reference" },
  { key: "Year", label: "Year Published" },
  { key: "Methodology", label: "Methodology Used" },
  { key: "Sample Size", label: "Sample Size" },
  { key: "Key Finding", label: "Main Finding / Abstract", multiline: true },
];

export function DocumentContextDrawer({ open, onClose, documentId }: Props) {
  const { activeProjectId } = useAppStore();
  const { projects, documents, updateDocumentMetadata } = useProjectStore();

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeDoc = documents.find(d => d.id === documentId);
  const isMetaSynthesis = activeProject?.projectType === "meta-synthesis";
  const fields = isMetaSynthesis ? META_FIELDS : PRIMARY_FIELDS;

  const [localData, setLocalData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && activeDoc) {
      setLocalData(activeDoc.metadata || {});
    }
  }, [open, activeDoc]);

  const handleChange = (key: string, value: string) => {
    setLocalData(prev => ({ ...prev, [key]: value }));
  };

  const handleBlur = (key: string) => {
    if (!activeDoc) return;
    setIsSaving(true);
    updateDocumentMetadata(activeDoc.id, { ...activeDoc.metadata, [key]: localData[key] });
    setTimeout(() => setIsSaving(false), 400); // UI feedback
  };

  if (!activeDoc) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-0 bottom-0 right-0 w-[400px] z-[201] flex flex-col shadow-2xl border-l"
            style={{ background: "var(--bg-primary)", borderColor: "var(--border-subtle)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-secondary)" }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-xl border" style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--accent)" }}>
                  {isMetaSynthesis ? <Database className="h-5 w-5" /> : <UserCircle className="h-5 w-5" />}
                </div>
                <div>
                  <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {isMetaSynthesis ? "Study Context" : "Participant Demographics"}
                  </h2>
                  <p className="text-[10px] w-48 truncate" style={{ color: "var(--text-muted)" }}>{activeDoc.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AnimatePresence>
                  {isSaving && (
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mr-2">
                      <Save className="h-4 w-4 text-green-500 animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
                {isMetaSynthesis 
                  ? "Record information about the study or publication to contextualize your findings in the meta-synthesis."
                  : "Record demographics and contextual factors about this participant."}
              </div>

              {fields.map((field) => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {field.label}
                  </label>
                  {field.multiline ? (
                    <textarea
                      value={localData[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onBlur={() => handleBlur(field.key)}
                      rows={4}
                      className="w-full text-sm rounded-xl border p-3 outline-none resize-none transition-all focus:ring-2 focus:ring-[var(--accent)]"
                      style={{ background: "var(--surface)", borderColor: "var(--border)", color: "var(--text-primary)" }}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                    />
                  ) : (
                    <Input
                      value={localData[field.key] || ""}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      onBlur={() => handleBlur(field.key)}
                      placeholder={`Enter ${field.label.toLowerCase()}...`}
                      className="h-10 border-[var(--border)] focus:border-[var(--accent)] rounded-xl"
                    />
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-4 border-t text-center text-[10px]" style={{ borderColor: "var(--border-subtle)", color: "var(--text-disabled)" }}>
              Data auto-saves when you click outside the field.
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
