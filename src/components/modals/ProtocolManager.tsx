import { useState, useMemo } from "react";
import { 
  BookOpen, 
  History, 
  Save, 
  X, 
  MessageSquare,
  Trash2,
  Clock
} from "lucide-react";
import { useProjectStore } from "@/store/project.store";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

interface ProtocolManagerProps {
  open: boolean;
  onClose: () => void;
}

export function ProtocolManager({ open, onClose }: ProtocolManagerProps) {
  const { activeProjectId } = useAppStore();
  const { protocolVersions, addProtocolVersion, deleteProtocolVersion } = useProjectStore();

  const projectVersions = useMemo(() => 
    protocolVersions
      .filter(v => v.projectId === activeProjectId)
      .sort((a, b) => b.date - a.date),
    [protocolVersions, activeProjectId]
  );

  const [content, setContent] = useState(projectVersions[0]?.content || "");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeLog, setChangeLog] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const selectedVersion = useMemo(() => 
    projectVersions.find(v => v.id === selectedVersionId) || projectVersions[0],
    [projectVersions, selectedVersionId]
  );

  const hasChanges = content !== (projectVersions[0]?.content || "");

  const handleSave = () => {
    if (!activeProjectId || !content.trim()) return;
    addProtocolVersion(activeProjectId, content, changeLog || "Versiyon güncellendi");
    setChangeLog("");
    setShowSaveModal(false);
    setSelectedVersionId(null);
  };

  const formatDate = (ts: number) => {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(ts);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-primary)] overflow-hidden">
      {/* Header */}
      <header className="flex h-14 items-center justify-between px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Dinamik Soru Kılavuzu (Protocol)
            </h2>
            <p className="text-[11px] text-[var(--text-muted)]">
              Görüşme protokolünüzü ve süreç içindeki değişimleri yönetin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button 
              variant="primary" 
              size="sm" 
              onClick={() => setShowSaveModal(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              <Save className="h-3.5 w-3.5" />
              Yeni Versiyon Olarak Kaydet
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Editor Side */}
        <main className="flex-1 flex flex-col bg-[var(--bg-primary)] relative">
          <div className="absolute top-4 right-6 pointer-events-none opacity-40">
            <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text-disabled)]">
              {selectedVersionId ? "Versiyon İzleme" : "Güncel Taslak"}
            </span>
          </div>
          
          <textarea
            className="flex-1 w-full h-full p-12 bg-transparent text-[var(--text-primary)] text-sm leading-relaxed outline-none resize-none font-sans"
            placeholder="# Görüşme Protokolü\n\n1. Giriş soruları...\n2. Temel sorular..."
            value={selectedVersionId ? selectedVersion?.content : content}
            onChange={(e) => !selectedVersionId && setContent(e.target.value)}
            readOnly={!!selectedVersionId}
            style={{ 
              maxWidth: "900px", 
              margin: "0 auto",
              fontFamily: "'Inter', sans-serif"
            }}
          />

          {selectedVersionId && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-blue-500 text-white text-xs font-medium shadow-xl flex items-center gap-2">
              <History className="h-3.5 w-3.5" />
              Eski bir versiyonu görüntülüyorsunuz. Düzenlemek için geçmişten çıkın.
              <button 
                onClick={() => setSelectedVersionId(null)}
                className="ml-2 pl-2 border-l border-white/20 hover:text-white/80"
              >
                Taslağa Dön
              </button>
            </div>
          )}
        </main>

        {/* History Sidebar */}
        <aside className="w-80 border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] flex flex-col">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-2">
              <History className="h-3 w-3" />
              Versiyon Geçmişi
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="divide-y divide-[var(--border-subtle)]">
              <button
                onClick={() => setSelectedVersionId(null)}
                className={cn(
                  "w-full text-left p-4 hover:bg-[var(--surface-hover)] transition-colors relative",
                  !selectedVersionId && "bg-[var(--bg-primary)]"
                )}
              >
                {!selectedVersionId && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                )}
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-[var(--text-primary)]">
                    Mevcut Taslak
                  </span>
                  <span className="text-[10px] text-blue-500 font-bold uppercase px-1 rounded bg-blue-500/10">
                    Aktif
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] line-clamp-1 italic">
                  Kaydedilmemiş değişiklikler içeriyor olabilir...
                </p>
              </button>

              {projectVersions.map((v) => (
                <div key={v.id} className="relative group">
                  <button
                    onClick={() => setSelectedVersionId(v.id)}
                    className={cn(
                      "w-full text-left p-4 hover:bg-[var(--surface-hover)] transition-colors",
                      selectedVersionId === v.id && "bg-[var(--bg-primary)]"
                    )}
                  >
                    {selectedVersionId === v.id && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                    )}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-[var(--text-secondary)] flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(v.date)}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="h-3 w-3 mt-0.5 text-[var(--text-disabled)]" />
                      <p className="text-[11px] text-[var(--text-primary)] line-clamp-2 leading-tight">
                        {v.changeLog}
                      </p>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteProtocolVersion(v.id); }}
                    className="absolute top-4 right-2 p-1 rounded hover:bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}

              {projectVersions.length === 0 && (
                <div className="p-8 text-center">
                  <BookOpen className="h-8 w-8 mx-auto mb-3 text-[var(--border)]" />
                  <p className="text-xs text-[var(--text-muted)]">
                    Henüz kaydedilmiş bir versiyon bulunmuyor.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Save Modal */}
      <Modal 
        open={showSaveModal} 
        onClose={() => setShowSaveModal(false)} 
        title="Versiyonu Kaydet"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Bu versiyonda neler değişti? Kısa bir özet yazarak takibini kolaylaştırabilirsiniz.
          </p>
          <Input 
            label="Değişim Günlüğü (Change Log)"
            placeholder="Örn: 2. Soru daha açık hale getirildi, demografi bölümü eklendi."
            value={changeLog}
            onChange={(e) => setChangeLog(e.target.value)}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowSaveModal(false)}>
              İptal
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={!changeLog.trim()}>
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
