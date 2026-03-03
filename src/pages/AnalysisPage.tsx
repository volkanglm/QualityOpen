import { useState, useMemo } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  LayoutGrid,
  FileText,
  Activity,
  Box,
  Share2,
  Type,
  ChevronDown,
  Maximize2,
  X,
  Tag,
  Hash,
  TrendingUp,
  PieChart,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  BarChart2,
} from "lucide-react";
import React from "react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useT } from "@/lib/i18n";

// -- Components --
import { CodeHeatmap } from "@/components/charts/CodeHeatmap";
import { NarrativeFlow } from "@/components/charts/NarrativeFlow";
import { DocumentPortrait } from "@/components/charts/DocumentPortrait";
import { ThematicNetwork } from "@/components/charts/ThematicNetwork";
import { TypographicCloud } from "@/components/charts/TypographicCloud";
import { BubbleCloud } from "@/components/charts/BubbleCloud";
import { HeatmapMatrix } from "@/components/charts/HeatmapMatrix";
import { CoOccurrenceGraph } from "@/components/charts/CoOccurrenceGraph";
import { DemographicDistribution } from "@/components/charts/DemographicDistribution";
import { SubCodeDistribution } from "@/components/charts/SubCodeDistribution";
import { flattenCodes } from "@/lib/tree";

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
};

type TabId = "dashboard" | "overview" | "cloud" | "matrix" | "network";

export function AnalysisPage() {
  const t = useT();
  const { activeProjectId, activeDocumentId, setActiveProject, setActiveDocument } = useAppStore();
  const { projects, documents, codes, segments } = useProjectStore();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isProjectScope, setIsProjectScope] = useState(false);
  const [maximizedCard, setMaximizedCard] = useState<{ title: string; component: React.ReactNode; zoom: number } | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [tabZoom, setTabZoom] = useState(1.0);

  const projectDocs = useMemo(() => documents.filter((d) => d.projectId === activeProjectId), [documents, activeProjectId]);
  const projectCodes = useMemo(() => codes.filter((c) => c.projectId === activeProjectId), [codes, activeProjectId]);
  const projectSegments = useMemo(() => segments.filter((s) => s.projectId === activeProjectId), [segments, activeProjectId]);

  const activeDoc = useMemo(() => projectDocs.find((d) => d.id === activeDocumentId) || projectDocs[0], [projectDocs, activeDocumentId]);

  const scopedSegments = useMemo(() => {
    if (isProjectScope) return projectSegments;
    return projectSegments.filter(s => s.documentId === activeDoc?.id);
  }, [isProjectScope, projectSegments, activeDoc]);

  const scopedDocs = useMemo(() => {
    if (isProjectScope) return projectDocs;
    return activeDoc ? [activeDoc] : [];
  }, [isProjectScope, projectDocs, activeDoc]);

  // Derived data for legacy views
  const codeFrequency = useMemo(() => {
    const flat = flattenCodes(projectCodes, undefined, 0);
    return flat.map((c) => {
      const count = projectSegments.filter((s) => s.codeIds.includes(c.id)).length;
      const ownCount = projectSegments.filter((s) => s.codeIds.length === 1 && s.codeIds[0] === c.id).length;
      return { code: c, count, ownCount, depth: c.depth };
    }).sort((a, b) => b.count - a.count);
  }, [projectCodes, projectSegments]);

  if (!activeProjectId) {
    return (
      <div className="flex h-full items-center justify-center bg-[var(--bg-primary)]">
        <p className="text-sm text-[var(--text-secondary)]">{t("analysis.noProject")}</p>
      </div>
    );
  }

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "Dashboard", icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "overview", label: t("analysis.overview"), icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "cloud", label: t("analysis.cloud"), icon: <Box className="h-3.5 w-3.5" /> },
    { id: "matrix", label: t("analysis.matrix"), icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "network", label: t("analysis.network"), icon: <Share2 className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] relative">
      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-8 pt-5 pb-4 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50 overflow-x-auto custom-scrollbar gap-8">
        <div className="flex items-center gap-6 min-w-max">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--text-primary)] flex items-center gap-2 whitespace-nowrap">
              <LayoutGrid className="h-5 w-5 text-[var(--text-secondary)] flex-shrink-0" />
              {t("analysis.title")}
            </h1>
            <p className="text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest mt-1 whitespace-nowrap">
              {projectCodes.length} KOD · {projectSegments.length} SEGMENT · {projectDocs.length} BELGE
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex items-center bg-[var(--bg-tertiary)]/50 p-1 rounded-lg border border-[var(--border)] ml-4 flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setTabZoom(1.0); // Reset zoom on tab change
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id
                    ? "bg-[var(--surface)] text-[var(--text-primary)] shadow-sm"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 min-w-max flex-shrink-0">
          {/* Scope Toggle */}
          <div className="flex items-center gap-2 mr-2">
            <span className={cn("text-[11px] uppercase tracking-wider font-bold", isProjectScope ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]")}>
              Belge
            </span>
            <button
              onClick={() => setIsProjectScope(!isProjectScope)}
              className="w-8 h-4 bg-[var(--surface)] rounded-full relative p-0.5 transition-colors"
            >
              <motion.div
                animate={{ x: isProjectScope ? 16 : 0 }}
                className="w-3 h-3 bg-[var(--text-secondary)] rounded-full"
              />
            </button>
            <span className={cn("text-[11px] uppercase tracking-wider font-bold", !isProjectScope ? "text-[var(--text-muted)]" : "text-[var(--text-secondary)]")}>
              Proje
            </span>
          </div>

          {/* Scope-aware Selector Dropdown (Document or Project) */}
          <div className="relative">
            <button
              onClick={() => setSelectorOpen(!selectorOpen)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)] text-[12px] font-medium hover:bg-[var(--surface-hover)] transition-colors min-w-[200px] justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                {isProjectScope ? (
                  <Box className="h-3.5 w-3.5 text-blue-500" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                )}
                <span className="truncate text-[var(--text-primary)]">
                  {isProjectScope
                    ? (projects.find(p => p.id === activeProjectId)?.name || "Proje Seç")
                    : (activeDoc?.name || "Belge Seç")
                  }
                </span>
              </div>
              <ChevronDown className={cn("h-3 w-3 text-[var(--text-muted)] transition-transform", selectorOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {selectorOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setSelectorOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute top-full right-0 mt-2 w-72 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl shadow-2xl z-50 py-2 overflow-hidden"
                  >
                    <div className="px-3 py-1.5 border-b border-[var(--border-subtle)] mb-1">
                      <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1">
                        {isProjectScope ? "Proje Değiştir" : "Belge Seç"}
                      </span>
                    </div>
                    <div className="max-h-80 overflow-y-auto custom-scrollbar">
                      {isProjectScope ? (
                        projects.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setActiveProject(p.id);
                              setSelectorOpen(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-[12px] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between",
                              p.id === activeProjectId ? "text-[var(--text-primary)] bg-[var(--surface)]" : "text-[var(--text-secondary)]"
                            )}
                          >
                            <span className="truncate">{p.name}</span>
                            {p.id === activeProjectId && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          </button>
                        ))
                      ) : (
                        projectDocs.map(d => (
                          <button
                            key={d.id}
                            onClick={() => {
                              setActiveDocument(d.id);
                              setSelectorOpen(false);
                            }}
                            className={cn(
                              "w-full px-4 py-2.5 text-left text-[12px] hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between",
                              d.id === activeDoc?.id ? "text-[var(--text-primary)] bg-[var(--surface)]" : "text-[var(--text-secondary)]"
                            )}
                          >
                            <span className="truncate">{d.name}</span>
                            {d.id === activeDoc?.id && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-12 gap-8 h-fit pb-12"
            >
              {/* 1. CODE HEATMAP */}
              <DashboardCard
                title="Kod Matrisi"
                icon={<Activity className="h-4 w-4" />}
                className="col-span-8 h-[340px]"
                onMaximize={(z) => setMaximizedCard({ title: "Kod Matrisi", component: <CodeHeatmap codes={projectCodes} docs={scopedDocs} segments={scopedSegments} />, zoom: z })}
              >
                <CodeHeatmap codes={projectCodes} docs={scopedDocs} segments={scopedSegments} />
              </DashboardCard>

              {/* 1.5 DEMOGRAPHIC DISTRIBUTION */}
              <DashboardCard
                title="Değişken Dağılımı"
                icon={<PieChart className="h-4 w-4" />}
                className="col-span-4 h-[340px]"
                onMaximize={(z) => setMaximizedCard({ title: "Değişken Dağılımı", component: <DemographicDistribution />, zoom: z })}
              >
                <DemographicDistribution />
              </DashboardCard>

              {/* 1.7 SUB-CODE DISTRIBUTION */}
              <DashboardCard
                title="Alt-Kod Dağılımı"
                icon={<BarChart2 className="h-4 w-4" />}
                className="col-span-12 h-[340px]"
                onMaximize={(z) => setMaximizedCard({ title: "Alt-Kod Dağılımı", component: <SubCodeDistribution codes={projectCodes} segments={scopedSegments} />, zoom: z })}
              >
                <SubCodeDistribution codes={projectCodes} segments={scopedSegments} />
              </DashboardCard>

              {/* 2. DOCUMENT PORTRAIT */}
              <DashboardCard
                title="Belge Portresi"
                icon={<FileText className="h-4 w-4" />}
                className="col-span-8 h-[340px]"
                onMaximize={(z) => setMaximizedCard({
                  title: "Belge Portresi",
                  component: <DocumentPortrait codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />,
                  zoom: z
                })}
              >
                <DocumentPortrait codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />
              </DashboardCard>

              {/* 3. NARRATIVE FLOW */}
              <DashboardCard
                title="Anlatı Akışı"
                icon={<Share2 className="h-4 w-4" />}
                className="col-span-7 h-[380px]"
                onMaximize={(z) => setMaximizedCard({
                  title: "Anlatı Akışı",
                  component: <NarrativeFlow codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />,
                  zoom: z
                })}
              >
                <NarrativeFlow codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />
              </DashboardCard>

              {/* 4. TYPOGRAPHIC CLOUD */}
              <DashboardCard
                title="Kavramsal Bulut"
                icon={<Type className="h-4 w-4" />}
                className="col-span-5 h-[380px]"
                onMaximize={(z) => setMaximizedCard({ title: "Kavramsal Bulut", component: <TypographicCloud codes={projectCodes} segments={scopedSegments} />, zoom: z })}
              >
                <TypographicCloud codes={projectCodes} segments={scopedSegments} />
              </DashboardCard>

              {/* 5. THEMATIC NETWORK */}
              <DashboardCard
                title="Tematik Ağ"
                icon={<Box className="h-4 w-4" />}
                className="col-span-12 h-[500px]"
                onMaximize={(z) => setMaximizedCard({ title: "Tematik Ağ", component: <ThematicNetwork codes={projectCodes} segments={scopedSegments} />, zoom: z })}
              >
                <ThematicNetwork codes={projectCodes} segments={scopedSegments} />
              </DashboardCard>
            </motion.div>
          )}

          {activeTab === "overview" && (
            <motion.div
              key="overview"
              variants={pageVariants}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <OverviewTab docs={projectDocs} codes={projectCodes} segments={projectSegments} codeFrequency={codeFrequency} />
            </motion.div>
          )}

          {activeTab === "cloud" && (
            <motion.div key="cloud" variants={pageVariants} initial="hidden" animate="show" className="h-full bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border)] p-8 relative overflow-hidden">
              <BubbleCloud items={codeFrequency.map(f => ({ code: f.code, count: f.count }))} zoom={tabZoom} />
              <div className="absolute bottom-6 right-6">
                <ZoomControls zoom={tabZoom} onZoomChange={setTabZoom} />
              </div>
            </motion.div>
          )}

          {activeTab === "matrix" && (
            <motion.div key="matrix" variants={pageVariants} initial="hidden" animate="show" className="h-full bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border)] relative overflow-hidden">
              <HeatmapMatrix codes={projectCodes} docs={projectDocs} segments={projectSegments} zoom={tabZoom} />
              <div className="absolute bottom-6 right-6">
                <ZoomControls zoom={tabZoom} onZoomChange={setTabZoom} />
              </div>
            </motion.div>
          )}

          {activeTab === "network" && (
            <motion.div key="network" variants={pageVariants} initial="hidden" animate="show" className="h-full bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border)] relative overflow-hidden">
              <CoOccurrenceGraph codes={projectCodes} segments={projectSegments} zoom={tabZoom} />
              <div className="absolute bottom-6 right-6">
                <ZoomControls zoom={tabZoom} onZoomChange={setTabZoom} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Maximize Modal */}
      <AnimatePresence>
        {maximizedCard && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setMaximizedCard(null)}
            />
            <motion.div
              layoutId={maximizedCard.title}
              className="relative w-full h-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex-shrink-0 px-8 py-6 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{maximizedCard.title}</h2>
                  <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">Expanded View</span>
                  <div className="flex items-center gap-1 ml-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 shadow-sm">
                    <button
                      onClick={() => setMaximizedCard(prev => prev ? { ...prev, zoom: Math.max(prev.zoom - 0.2, 0.5) } : null)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setMaximizedCard(prev => prev ? { ...prev, zoom: 1.0 } : null)}
                      className="px-2 py-1 text-[10px] font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md transition-colors"
                    >
                      {Math.round(maximizedCard.zoom * 100)}%
                    </button>
                    <button
                      onClick={() => setMaximizedCard(prev => prev ? { ...prev, zoom: Math.min(prev.zoom + 0.2, 3.0) } : null)}
                      className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setMaximizedCard(null)}
                  className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 p-8 text-[var(--text-primary)] overflow-auto custom-scrollbar">
                <div className="h-full w-full relative">
                  {React.Children.map(maximizedCard.component, child => {
                    if (React.isValidElement(child)) {
                      return React.cloneElement(child, { zoom: maximizedCard.zoom } as any);
                    }
                    return child;
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -- Sub components --

function ZoomControls({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number | ((prev: number) => number)) => void }) {
  return (
    <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 shadow-xl backdrop-blur-md">
      <button
        onClick={() => onZoomChange(prev => Math.max(prev - 0.2, 0.5))}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        title="Zoom Out"
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        onClick={() => onZoomChange(1.0)}
        className="px-2 py-1 text-[10px] font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md transition-colors"
        title="Reset Zoom"
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={() => onZoomChange(prev => Math.min(prev + 0.2, 3.0))}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        title="Zoom In"
      >
        <ZoomIn className="h-4 w-4" />
      </button>
    </div>
  );
}

function DashboardCard({ title, icon, children, className, onMaximize }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; onMaximize?: (zoom: number) => void }) {
  const [zoom, setZoom] = useState(1.0);

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.min(prev + 0.2, 3.0));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(prev => Math.max(prev - 0.2, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(1.0);
  };

  return (
    <div className={cn(
      "flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/60 transition-all overflow-hidden group",
      className
    )}>
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-[var(--border)]/50">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{icon}</span>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Reset Zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-3 bg-[var(--border)] mx-1" />
          <button
            onClick={() => onMaximize?.(zoom)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title="Maximize"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { zoom } as any);
          }
          return child;
        })}
      </div>
    </div>
  );
}

function OverviewTab({ docs, codes, segments, codeFrequency }: { docs: any[]; codes: any[]; segments: any[]; codeFrequency: any[] }) {
  const t = useT();
  const stats = [
    { label: t("nav.documents"), value: docs.length, color: "var(--text-muted)", icon: FileText },
    { label: t("analysis.codes"), value: codes.length, color: "var(--text-muted)", icon: Tag },
    { label: t("analysis.segments"), value: segments.length, color: "var(--text-muted)", icon: Hash },
    { label: "Segment/Belge", value: docs.length ? (segments.length / docs.length).toFixed(1) : "0", icon: TrendingUp },
  ];

  return (
    <div className="space-y-8 pb-12">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-[var(--bg-secondary)]/40 border border-[var(--border)] p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)]">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Frequency Column */}
        <div className="col-span-8 bg-[var(--bg-secondary)]/40 border border-[var(--border)] p-8 rounded-2xl h-[500px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-[var(--text-muted)]" />
              {t("analysis.frequency")}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-3">
            {codeFrequency.slice(0, 10).map(f => (
              <div key={f.code.id} className="group">
                <div className="flex items-center justify-between text-[11px] mb-1.5 px-1">
                  <span className="font-medium text-[var(--text-secondary)]">{f.code.name}</span>
                  <span className="text-[var(--text-muted)] font-mono">{f.count}</span>
                </div>
                <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(f.count / (codeFrequency[0]?.count || 1)) * 100}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: f.code.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Column */}
        <div className="col-span-4 bg-[var(--bg-secondary)]/40 border border-[var(--border)] p-8 rounded-2xl flex flex-col items-center justify-center">
          <PieChart className="h-12 w-12 text-[var(--border)] mb-6" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">{t("analysis.distribution")}</p>
          <p className="text-sm text-[var(--text-secondary)] text-center px-4">Kod dağılım grafiği ve detaylı analizler için diğer sekmeleri kullanabilirsiniz.</p>
        </div>
      </div>
    </div>
  );
}

const cn = (...args: (string | undefined | boolean)[]) => args.filter(Boolean).join(" ");
