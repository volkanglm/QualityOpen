import { useMemo } from "react";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import { useT } from "@/lib/i18n";
import { FileText, Tag } from "lucide-react";

export function DocumentPropertiesTable() {
  const t = useT();
  const { documents } = useProjectStore();
  const { activeProjectId } = useAppStore();

  const projectDocs = useMemo(
    () => documents.filter((d) => d.projectId === activeProjectId),
    [documents, activeProjectId]
  );

  const allPropertyKeys = useMemo(() => {
    const keys = new Set<string>();
    projectDocs.forEach(doc => {
      if (doc.properties) {
        Object.keys(doc.properties).forEach(k => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [projectDocs]);

  if (projectDocs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center h-full opacity-50">
        <FileText className="h-8 w-8 mb-2" />
        <p className="text-xs">{t("analysis.noDataText")}</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto custom-scrollbar h-full">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead className="sticky top-0 z-10 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
            <tr>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{t("right.docName")}</th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{t("right.type")}</th>
              {allPropertyKeys.map(key => (
                <th key={key} className="px-4 py-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold flex items-center gap-1">
                  <Tag className="h-2.5 w-2.5" />
                  {key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {projectDocs.map((doc, idx) => (
              <tr 
                key={doc.id} 
                className="border-b border-[var(--border-subtle)] hover:bg-[var(--surface-hover)] transition-colors"
                style={{ background: idx % 2 === 0 ? "transparent" : "var(--bg-tertiary)/20" }}
              >
                <td className="px-4 py-2.5 text-[12px] font-medium text-[var(--text-primary)] truncate max-w-[200px]">
                  {doc.name}
                </td>
                <td className="px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
                  <span className="px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] capitalize">
                    {t(`left.type.${doc.type}`)}
                  </span>
                </td>
                {allPropertyKeys.map(key => (
                  <td key={key} className="px-4 py-2.5 text-[11px] text-[var(--text-secondary)]">
                    {doc.properties?.[key] || "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
