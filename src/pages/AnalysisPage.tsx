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
  Sparkles,
  Download,
  Search,
} from "lucide-react";
import React from "react";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useT } from "@/lib/i18n";
import type { Document, Code, Segment } from "@/types";

import { cn } from "@/lib/utils";

import { PaletteSwitcher } from "@/components/analysis/PaletteSwitcher";
import { SegmentSearchPanel } from "@/components/analysis/SegmentSearchPanel";
import { useVisualThemeStore } from "@/store/visualTheme.store";

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
import { SynthesisGrid } from "@/components/analysis/SynthesisGrid";
import { Counter } from "@/components/ui/Counter";
import { assignClusters, computeGraphData } from "@/lib/graph.utils";
import { flattenCodes } from "@/lib/tree";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const pageVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18, ease: [0.2, 0, 0, 1] } },
};

type TabId = "dashboard" | "overview" | "cloud" | "matrix" | "network" | "synthesis" | "typology";

export function AnalysisPage() {
  const t = useT();
  const { activeProjectId, activeDocumentId, setActiveProject, setActiveDocument } = useAppStore();
  const { projects, documents, codes, segments } = useProjectStore();

  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isProjectScope, setIsProjectScope] = useState(false);
  const [maximizedCard, setMaximizedCard] = useState<{ title: string; component: React.ReactNode; zoom: number } | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [tabZoom, setTabZoom] = useState(1.0);
  const [segSearchOpen, setSegSearchOpen] = useState(false);

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
    { id: "dashboard", label: t("nav.analysis"), icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "overview", label: t("analysis.overview"), icon: <Activity className="h-3.5 w-3.5" /> },
    { id: "cloud", label: t("analysis.cloud"), icon: <Box className="h-3.5 w-3.5" /> },
    { id: "matrix", label: t("analysis.matrix"), icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "network", label: t("analysis.network"), icon: <Share2 className="h-3.5 w-3.5" /> },
    { id: "typology", label: t("analysis.typologyTab"), icon: <LayoutGrid className="h-3.5 w-3.5" /> },
    { id: "synthesis", label: t("synthesis.title"), icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] relative">
      {/* ── Header ── */}
      <div className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-secondary)]/50 no-export">
        {/* Row 1: Title, Selector & Global Controls */}
        <div className="flex items-center justify-between px-8 py-4 gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] shadow-sm">
                <LayoutGrid className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold tracking-tight text-[var(--text-primary)]">
                  {t("analysis.title")}
                </h1>
                <p className="text-[10px] text-[var(--text-muted)] font-medium uppercase tracking-[0.15em] mt-0.5 whitespace-nowrap opacity-80">
                  {t("analysis.counts")
                    .replace("{codes}", projectCodes.length.toString())
                    .replace("{segments}", projectSegments.length.toString())
                    .replace("{docs}", projectDocs.length.toString())}
                </p>
              </div>
            </div>

            <div className="w-px h-8 bg-[var(--border)] mx-2 hidden lg:block" />

            {/* Scope-aware Selector Dropdown */}
            <div className="relative group/selector">
              <button
                onClick={() => setSelectorOpen(!selectorOpen)}
                className="flex items-center gap-2 h-9 px-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border)] text-[11px] font-bold hover:bg-[var(--surface-hover)] transition-all min-w-[220px] justify-between shadow-sm uppercase tracking-wider"
              >
                <div className="flex items-center gap-2 truncate">
                  {isProjectScope ? (
                    <Box className="h-3.5 w-3.5 text-blue-500" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  )}
                  <span className="truncate text-[var(--text-primary)]">
                    {isProjectScope
                      ? (projects.find(p => p.id === activeProjectId)?.name || t("analysis.selectProject"))
                      : (activeDoc?.name || t("analysis.selectDoc"))
                    }
                  </span>
                </div>
                <ChevronDown className={cn("h-3 w-3 text-[var(--text-muted)] transition-transform", selectorOpen && "rotate-180")} />
              </button>

              <AnimatePresence>
                {selectorOpen && (
                  <>
                    <div className="fixed inset-0 z-[190]" onClick={() => setSelectorOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      className="absolute top-full left-0 mt-2 w-80 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-[200] py-2 overflow-hidden backdrop-blur-xl"
                    >
                      <div className="px-4 py-2 border-b border-[var(--border-subtle)] mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                          {isProjectScope ? "Proje Seçin" : "Belge Seçin"}
                        </span>
                        <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] rounded-full p-0.5 border border-[var(--border)]">
                          <button onClick={() => setIsProjectScope(false)} className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-colors", !isProjectScope ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}>Doc</button>
                          <button onClick={() => setIsProjectScope(true)} className={cn("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase transition-colors", isProjectScope ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300")}>Proj</button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto custom-scrollbar px-1">
                        {isProjectScope ? (
                          projects.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setActiveProject(p.id);
                                setSelectorOpen(false);
                              }}
                              className={cn(
                                "w-full px-3 py-2.5 rounded-xl text-left text-[12px] font-medium hover:bg-[var(--surface-hover)] transition-all flex items-center justify-between group",
                                p.id === activeProjectId ? "text-[var(--accent)] bg-[var(--accent-subtle)]/10" : "text-[var(--text-secondary)]"
                              )}
                            >
                              <span className="truncate">{p.name}</span>
                              {p.id === activeProjectId && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
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
                                "w-full px-3 py-2.5 rounded-xl text-left text-[12px] font-medium hover:bg-[var(--surface-hover)] transition-all flex items-center justify-between group",
                                d.id === activeDocumentId ? "text-[var(--accent)] bg-[var(--accent-subtle)]/10" : "text-[var(--text-secondary)]"
                              )}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <FileText className="h-3.5 w-3.5 opacity-50" />
                                <span className="truncate">{d.name}</span>
                              </div>
                              {d.id === activeDocumentId && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
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

          {/* Segment Search + Palette Switcher */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSegSearchOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-xl border text-[11px] font-semibold hover:bg-[var(--surface-hover)] transition-colors"
              style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
              title={t("segment.search.title")}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("segment.search.title")}</span>
            </button>
            <PaletteSwitcher />
          </div>
        </div>
      </div>

      <SegmentSearchPanel isOpen={segSearchOpen} onClose={() => setSegSearchOpen(false)} />

      {/* Row 2: Tabs */}
      <div className="px-8 pb-3 -mt-1 overflow-x-auto custom-scrollbar-hide">
        <div className="flex items-center gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setTabZoom(1.0);
              }}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all relative",
                activeTab === tab.id
                  ? "text-[var(--accent)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-2 right-2 h-0.5 bg-[var(--accent)] rounded-full"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
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
                title={t("analysis.matrixTitle")}
                icon={<Activity className="h-4 w-4" />}
                className="col-span-8 h-[340px]"
                onMaximize={(z) => setMaximizedCard({ title: t("analysis.matrixTitle"), component: <CodeHeatmap codes={projectCodes} docs={scopedDocs} segments={scopedSegments} />, zoom: z })}
              >
                <CodeHeatmap codes={projectCodes} docs={scopedDocs} segments={scopedSegments} />
              </DashboardCard>

              {/* 1.5 DEMOGRAPHIC DISTRIBUTION */}
              <DashboardCard
                title={t("analysis.distributionTitle")}
                icon={<PieChart className="h-4 w-4" />}
                className="col-span-4 h-[340px]"
                onMaximize={(z) => setMaximizedCard({ title: t("analysis.distributionTitle"), component: <DemographicDistribution />, zoom: z })}
              >
                <DemographicDistribution />
              </DashboardCard>

              {/* 1.7 SUB-CODE DISTRIBUTION */}
              <DashboardCard
                title={t("analysis.subCodeTitle")}
                icon={<BarChart2 className="h-4 w-4" />}
                className="col-span-12 h-[340px]"
                onMaximize={(z) => setMaximizedCard({ title: t("analysis.subCodeTitle"), component: <SubCodeDistribution codes={projectCodes} segments={scopedSegments} />, zoom: z })}
              >
                <SubCodeDistribution codes={projectCodes} segments={scopedSegments} />
              </DashboardCard>

              {/* 2. DOCUMENT PORTRAIT */}
              <DashboardCard
                title={t("analysis.portraitTitle")}
                icon={<FileText className="h-4 w-4" />}
                className="col-span-8 h-[340px]"
                onMaximize={(z) => setMaximizedCard({
                  title: t("analysis.portraitTitle"),
                  component: <DocumentPortrait codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />,
                  zoom: z
                })}
              >
                <DocumentPortrait codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />
              </DashboardCard>

              {/* 3. NARRATIVE FLOW */}
              <DashboardCard
                title={t("analysis.flowTitle")}
                icon={<Share2 className="h-4 w-4" />}
                className="col-span-7 h-[380px]"
                onMaximize={(z) => setMaximizedCard({
                  title: t("analysis.flowTitle"),
                  component: <NarrativeFlow codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />,
                  zoom: z
                })}
              >
                <NarrativeFlow codes={projectCodes} doc={activeDoc} segments={scopedSegments} isProjectScope={isProjectScope} allDocs={projectDocs} />
              </DashboardCard>

              {/* 4. TYPOGRAPHIC CLOUD */}
              <DashboardCard
                title={t("analysis.conceptCloud")}
                icon={<Type className="h-4 w-4" />}
                className="col-span-5 h-[380px]"
                onMaximize={(z) => setMaximizedCard({ title: t("analysis.conceptCloud"), component: <TypographicCloud codes={projectCodes} segments={scopedSegments} />, zoom: z })}
              >
                <TypographicCloud codes={projectCodes} segments={scopedSegments} />
              </DashboardCard>

              {/* 5. THEMATIC NETWORK */}
              <DashboardCard
                title={t("analysis.thematicNetwork")}
                icon={<Box className="h-4 w-4" />}
                className="col-span-12 h-[500px]"
                onMaximize={(z) => setMaximizedCard({ title: t("analysis.thematicNetwork"), component: <ThematicNetwork codes={projectCodes} segments={scopedSegments} />, zoom: z })}
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
              <BubbleCloud items={codeFrequency.map((f) => ({ code: f.code, count: f.count }))} zoom={tabZoom} />
              <div className="absolute bottom-6 right-6 no-export">
                <ZoomControls zoom={tabZoom} onZoomChange={setTabZoom} />
              </div>
            </motion.div>
          )}

          {activeTab === "matrix" && (
            <motion.div key="matrix" variants={pageVariants} initial="hidden" animate="show" className="h-full bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border)] relative overflow-hidden">
              <HeatmapMatrix codes={projectCodes} docs={projectDocs} segments={projectSegments} zoom={tabZoom} />
              <div className="absolute bottom-6 left-6 no-export">
                <ZoomControls zoom={tabZoom} onZoomChange={setTabZoom} />
              </div>
            </motion.div>
          )}

          {activeTab === "network" && (
            <motion.div key="network" variants={pageVariants} initial="hidden" animate="show" className="h-full bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border)] relative overflow-hidden">
              <CoOccurrenceGraph codes={projectCodes} segments={projectSegments} />
            </motion.div>
          )}

          {activeTab === "synthesis" && (
            <motion.div key="synthesis" variants={pageVariants} initial="hidden" animate="show" className="h-full bg-[var(--bg-secondary)]/40 rounded-2xl border border-[var(--border)] p-8 relative overflow-hidden">
              <SynthesisGrid codes={projectCodes} />
            </motion.div>
          )}

          {activeTab === "typology" && (
            <motion.div key="typology" variants={pageVariants} initial="hidden" animate="show" className="h-full">
              <TypologyTab docs={projectDocs} codes={projectCodes} segments={projectSegments} />
            </motion.div>
          )}
        </AnimatePresence>
      </div >

      {/* Maximize Modal */}
      <AnimatePresence>
        {
          maximizedCard && (
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
                    <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] text-[10px] text-[var(--text-muted)] font-mono uppercase tracking-widest">{t("analysis.expandedView")}</span>
                    <div className="flex items-center gap-1 ml-4 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl p-1 shadow-sm no-export">
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
                    className="p-2 rounded-full hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] no-export"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <div className="flex-1 p-8 text-[var(--text-primary)] overflow-auto custom-scrollbar">
                  <div className="h-full w-full relative">
                    {React.Children.map(maximizedCard.component, child => {
                      if (React.isValidElement(child)) {
                        return React.cloneElement(child, { zoom: maximizedCard.zoom } as React.Attributes);
                      }
                      return child;
                    })}
                  </div>
                </div>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence >
    </div >
  );
}

// -- Sub components --

function ZoomControls({ zoom, onZoomChange }: { zoom: number; onZoomChange: (z: number | ((prev: number) => number)) => void }) {
  const t = useT();
  return (
    <div className="flex items-center gap-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl p-1 shadow-xl backdrop-blur-md">
      <button
        onClick={() => onZoomChange(prev => Math.max(prev - 0.2, 0.5))}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        title={t("analysis.zoomOut")}
      >
        <ZoomOut className="h-4 w-4" />
      </button>
      <button
        onClick={() => onZoomChange(1.0)}
        className="px-2 py-1 text-[10px] font-mono font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] rounded-md transition-colors"
        title={t("analysis.resetZoom")}
      >
        {Math.round(zoom * 100)}%
      </button>
      <button
        onClick={() => onZoomChange(prev => Math.min(prev + 0.2, 3.0))}
        className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        title={t("analysis.zoomIn")}
      >
        <ZoomIn className="h-4 w-4" />
      </button>
    </div>
  );
}

function DashboardCard({ title, icon, children, className, onMaximize }: { title: string; icon: React.ReactNode; children: React.ReactNode; className?: string; onMaximize?: (zoom: number) => void }) {
  const t = useT();
  const [zoom, setZoom] = useState(1.0);
  const cardRef = React.useRef<HTMLDivElement>(null);

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

  const [exportOpen, setExportOpen] = useState(false);

  const handleExport = async (format: "png" | "jpeg", e: React.MouseEvent) => {
    e.stopPropagation();
    setExportOpen(false);
    if (!cardRef.current) return;
    const { exportElementAsImage } = await import("@/lib/exportChart");
    await exportElementAsImage(cardRef.current, title || "chart", format);
  };

  return (
    <div ref={cardRef} className={cn(
      "flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/60 transition-all overflow-hidden group relative",
      className
    )}>
      <div className="flex-shrink-0 px-6 py-4 flex items-center justify-between border-b border-[var(--border)]/50">
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">{icon}</span>
          <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
            {title}
          </h2>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity no-export">
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setExportOpen(!exportOpen); }}
              className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              title={t("common.export") || "Export"}
            >
              <Download className="h-3.5 w-3.5" />
            </button>
            <AnimatePresence>
              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute top-10 right-0 z-50 w-28 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden py-1"
                  >
                    <button
                      onClick={(e) => handleExport("png", e)}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-primary)]"
                    >
                      Export PNG
                    </button>
                    <button
                      onClick={(e) => handleExport("jpeg", e)}
                      className="w-full text-left px-3 py-1.5 text-[11px] font-medium hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-primary)]"
                    >
                      Export JPEG
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div className="w-px h-3 bg-[var(--border)] mx-1" />
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title={t("analysis.zoomOut")}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title={t("analysis.resetZoom")}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title={t("analysis.zoomIn")}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <div className="w-px h-3 bg-[var(--border)] mx-1" />
          <button
            onClick={() => onMaximize?.(zoom)}
            className="p-1.5 rounded-lg hover:bg-[var(--surface-hover)] transition-all text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            title={t("analysis.maximize")}
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 relative">
        {React.Children.map(children, child => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, { zoom } as React.Attributes);
          }
          return child;
        })}
      </div>
    </div>
  );
}

function OverviewTab({ docs, codes, segments, codeFrequency }: { docs: Document[]; codes: Code[]; segments: Segment[]; codeFrequency: { code: Code; count: number }[] }) {
  const t = useT();
  const { getCodeColor } = useVisualThemeStore();
  
  const pieData = useMemo(() => {
    const top = codeFrequency.slice(0, 5).map((f, idx) => ({ 
      id: f.code.id,
      name: f.code.name, 
      value: f.count, 
      color: getCodeColor(idx, f.code.color) 
    }));
    const others = codeFrequency.slice(5).reduce((acc, curr) => acc + curr.count, 0);
    if (others > 0) top.push({ id: "others", name: t("analysis.other"), value: others, color: "#52525b" });
    return top;
  }, [codeFrequency, t, getCodeColor]);

  const stats = useMemo(() => [
    { id: "docs", label: t("nav.documents"), value: docs.length, color: "var(--text-muted)", icon: FileText },
    { id: "codes", label: t("analysis.codes"), value: codes.length, color: "var(--text-muted)", icon: Tag },
    { id: "segments", label: t("analysis.segments"), value: segments.length, color: "var(--text-muted)", icon: Hash },
    { id: "growth", label: t("analysis.segPerDoc"), value: docs.length ? (segments.length / docs.length) : 0, icon: TrendingUp, isDecimal: true },
  ], [docs.length, codes.length, segments.length, t]);

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-4 gap-6">
        {stats.map((s) => (
          <div key={s.id} className="bg-[var(--bg-secondary)]/40 border border-[var(--border)] p-6 rounded-2xl flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[var(--surface)] text-[var(--text-secondary)]">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-bold">{s.label}</p>
              <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">
                <Counter value={s.value as number} decimals={s.isDecimal ? 1 : 0} />
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
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
                    style={{ backgroundColor: getCodeColor(codeFrequency.indexOf(f), f.code.color) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-4 bg-[var(--bg-secondary)]/40 border border-[var(--border)] p-8 rounded-2xl flex flex-col items-center justify-center relative">
          <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2 absolute top-8 left-8">
            <PieChart className="h-4 w-4 text-[var(--text-muted)]" />
            {t("analysis.distribution")}
          </h2>
          {codeFrequency.length > 0 ? (
            <div className="w-full h-[300px] mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '11px', fontWeight: 500 }}
                    itemStyle={{ color: 'var(--text-primary)' }}
                    formatter={(value: string | number | undefined) => [t("analysis.segCountTooltip").replace("{count}", (value ?? 0).toString()), ""]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <>
              <PieChart className="h-12 w-12 text-[var(--border)] mb-6" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2">{t("analysis.distribution")}</p>
              <p className="text-sm text-[var(--text-secondary)] text-center px-4">{t("analysis.noDataText")}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TypologyTab({ docs, codes, segments }: { docs: Document[]; codes: Code[]; segments: Segment[] }) {
  const t = useT();
  const { getCodeColor } = useVisualThemeStore();

  const clusters = useMemo(() => {
    const { nodes, edges } = computeGraphData(codes, segments, 800, 600);
    const clusteredNodes = assignClusters(nodes, edges);

    const clusterMap = new Map<string, { clusterId: string, codes: Code[] }>();
    clusteredNodes.forEach((node, idx) => {
      if (node.cluster) {
        let cluster = clusterMap.get(node.cluster);
        if (!cluster) {
          cluster = { clusterId: node.cluster, codes: [] };
          clusterMap.set(node.cluster, cluster);
        }
        cluster.codes.push({
          ...node.code,
          color: getCodeColor(idx, node.code.color)
        });
      }
    });

    const docClusterScores = new Map<string, Map<string, number>>();
    segments.forEach(seg => {
      const docId = seg.documentId;
      let scores = docClusterScores.get(docId);
      if (!scores) {
        scores = new Map();
        docClusterScores.set(docId, scores);
      }

      seg.codeIds.forEach((cid: string) => {
        const cNode = clusteredNodes.find(n => n.id === cid);
        if (cNode?.cluster) {
          scores.set(cNode.cluster, (scores.get(cNode.cluster) || 0) + 1);
        }
      });
    });

    const docToCluster = new Map<string, string>();
    docs.forEach(doc => {
      const scores = docClusterScores.get(doc.id);
      if (scores && scores.size > 0) {
        let maxCluster = "";
        let maxScore = -1;
        scores.forEach((score, cid) => {
          if (score > maxScore) {
            maxScore = score;
            maxCluster = cid;
          }
        });
        docToCluster.set(doc.id, maxCluster);
      }
    });

    return Array.from(clusterMap.values()).map(c => {
      const dDocs = docs.filter(d => docToCluster.get(d.id) === c.clusterId);
      return { ...c, docs: dDocs };
    }).filter(c => c.docs.length > 0);
  }, [codes, segments, docs, getCodeColor]);

  if (clusters.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--text-muted)] italic text-sm">
        <Sparkles className="h-5 w-5 mr-3 opacity-50" />
        {t("analysis.typologyEmpty")}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col pt-4">
      <div className="mb-6 flex flex-col gap-2 px-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)] flex items-center gap-2">
          <LayoutGrid className="h-4 w-4 text-[var(--text-muted)]" />
          {t("analysis.typologyTitle")}
        </h2>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          {t("analysis.typologyDesc")}
        </p>
      </div>
      <div className="flex-1 overflow-x-auto custom-scrollbar flex gap-6 px-8 pb-8 items-start">
        {clusters.map((cluster, i) => (
          <div key={cluster.clusterId} className="flex-shrink-0 w-80 flex flex-col bg-[var(--bg-secondary)]/40 border border-[var(--border)] rounded-2xl overflow-hidden max-h-[100%]">
            <div className="p-4 border-b border-[var(--border)] bg-[var(--surface)]/50 backdrop-blur-sm shadow-sm z-10">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-[13px] text-[var(--text-primary)]">{t("analysis.type")} {i + 1}</h3>
                <span className="text-[10px] font-mono bg-[var(--bg-tertiary)] px-2 py-0.5 rounded border border-[var(--border)] text-[var(--text-secondary)]">
                  {t("analysis.casesCount").replace("{count}", cluster.docs.length.toString())}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {cluster.codes.slice(0, 3).map(c => (
                  <span key={c.id} className="text-[9px] font-semibold px-2 py-1 rounded-full border truncate max-w-[120px]" style={{ borderColor: `${c.color}40`, color: c.color, backgroundColor: `${c.color}10` }}>
                    {c.name}
                  </span>
                ))}
                {cluster.codes.length > 3 && (
                  <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">
                    +{cluster.codes.length - 3}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar flex flex-col gap-3 min-h-0">
              {cluster.docs.map(doc => (
                <div key={doc.id} className="p-3 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-sm hover:border-[var(--border-strong)] transition-colors group cursor-pointer">
                  <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--text-primary)] mb-1 group-hover:text-blue-400 transition-colors">
                    <FileText className="h-3.5 w-3.5 text-[var(--text-muted)] group-hover:text-blue-400" />
                    <span className="truncate">{doc.name}</span>
                  </div>
                  {Object.keys(doc.properties ?? {}).length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2.5 overflow-hidden flex-wrap">
                      {Object.entries(doc.properties ?? {}).filter(([_, v]) => String(v).trim().length > 0).slice(0, 2).map(([k, v]) => (
                        <span key={k} className="text-[9px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] truncate max-w-[80px]" title={`${k}: ${v}`}>
                          {v as React.ReactNode}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
