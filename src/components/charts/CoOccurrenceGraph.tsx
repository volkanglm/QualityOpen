import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  Sun,
  Users,
  Settings2,
  X,
  ChevronDown,
  Info,
  Download
} from "lucide-react";
import { useT } from "@/hooks/useT";
import { computeGraphData, assignClusters } from "@/lib/graph.utils";
import { useProjectStore } from "@/store/project.store";
import { SegmentDrawer } from "@/components/analysis/SegmentDrawer";
import type { Code, Segment } from "@/types";
import { cn } from "@/lib/utils";
import { useVisualThemeStore } from "@/store/visualTheme.store";

// ─── Types ───────────────────────────────────────────────────────────────────

type CodeNodeData = {
  label: string;
  color: string;
  count: number;
  cluster?: string;
  isHovered?: boolean;
  isAnchor?: boolean;
};

type CodeNode = Node<CodeNodeData, "codeNode">;
type TheoryTemplate = "standard" | "solar" | "case";

// ─── Custom Node Component ───────────────────────────────────────────────────

function CodeNodeComponent({ data }: NodeProps<CodeNode>) {
  return (
    <div className="relative group">
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{
          scale: data.isAnchor ? 1.2 : 1,
          opacity: 1,
          boxShadow: data.isHovered ? `0 0 25px ${data.color}50` : data.isAnchor ? `0 0 40px ${data.color}30` : "none"
        }}
        whileHover={{ scale: 1.1 }}
        className={cn(
          "flex items-center justify-center rounded-full border-2 transition-all shadow-lg",
          data.isHovered ? "border-[var(--text-primary)]" : data.isAnchor ? "border-dashed border-4" : "border-opacity-60"
        )}
        style={{
          width: Math.max(40, 40 + data.count * 2) + "px",
          height: Math.max(40, 40 + data.count * 2) + "px",
          backgroundColor: data.color + (data.isAnchor ? "40" : "20"),
          borderColor: data.color,
        }}
      >
        <span
          className="text-[10px] font-bold pointer-events-none"
          style={{ color: data.color }}
        >
          {data.count}
        </span>

        {data.isAnchor && (
          <div className="absolute -top-1 -right-1 p-1 bg-[var(--surface)] border border-[var(--border)] rounded-full">
            <Sun className="h-2 w-2 text-yellow-500" />
          </div>
        )}
      </motion.div>

      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 whitespace-nowrap z-50">
        <span
          className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-secondary)] border shadow-sm",
            data.isAnchor ? "border-yellow-500/30" : "border-[var(--border)]"
          )}
          style={{ color: data.isHovered || data.isAnchor ? "var(--text-primary)" : "var(--text-secondary)" }}
        >
          {data.label}
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  codeNode: CodeNodeComponent,
};

// ─── Main Component ──────────────────────────────────────────────────────────

interface CoOccurrenceGraphProps {
  codes: Code[];
  segments: Segment[];
}

function CoOccurrenceGraphInner({ codes, segments }: CoOccurrenceGraphProps) {
  const t = useT();
  const { documents, graphSensitivity: sensitivity, setGraphSensitivity: setSensitivity } = useProjectStore();
  const { fitView } = useReactFlow();
  const { getCodeColor } = useVisualThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const [useClustering, setUseClustering] = useState(true);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Theory States
  const [activeTemplate, setActiveTemplate] = useState<TheoryTemplate>("standard");
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [isDocSelectorOpen, setIsDocSelectorOpen] = useState(false);

  // Drawer for Segment Traceability
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCode, setDrawerCode] = useState<Code | null>(null);

  const handleExport = async (format: "png" | "jpeg") => {
    if (!containerRef.current) return;
    const { exportElementAsImage } = await import("@/lib/exportChart");
    await exportElementAsImage(containerRef.current, "network-graph", format);
  };

  // 1. Filter Segments based on Case Network template
  const filteredSegments = useMemo(() => {
    if (activeTemplate === "case" && selectedDocIds.length > 0) {
      return segments.filter(s => selectedDocIds.includes(s.documentId));
    }
    return segments;
  }, [segments, activeTemplate, selectedDocIds]);

  // 2. Data Computation
  const { initialNodes, initialEdges } = useMemo(() => {
    // Only use codes that appear in the filtered segments
    const activeCodeIds = new Set(filteredSegments.flatMap(s => s.codeIds));
    const activeCodes = codes.filter(c => activeCodeIds.has(c.id));

    if (activeCodes.length === 0) return { initialNodes: [], initialEdges: [] };

    const { nodes: rawNodes, edges: rawEdges } = computeGraphData(
      activeCodes,
      filteredSegments,
      800,
      600,
      { anchorId: activeTemplate === "solar" ? anchorId : null }
    );

    const clusteredNodes = useClustering ? assignClusters(rawNodes, rawEdges) : rawNodes;

    const rfNodes: CodeNode[] = clusteredNodes.map((n, idx) => ({
      id: n.id,
      type: "codeNode",
      position: { x: n.x, y: n.y },
      data: {
        label: n.code.name,
        color: getCodeColor(idx, n.code.color),
        count: n.count,
        cluster: n.cluster,
        isHovered: false,
        isAnchor: n.id === anchorId && activeTemplate === "solar"
      },
      draggable: true,
    }));

    const rfEdges: Edge[] = rawEdges
      .filter((e) => e.weight >= sensitivity)
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        animated: e.weight > 3,
        style: {
          stroke: "var(--border-strong)",
          strokeWidth: 1 + e.weight * 0.5,
          opacity: 0.4
        },
      }));

    return { initialNodes: rfNodes, initialEdges: rfEdges };
  }, [codes, filteredSegments, sensitivity, useClustering, activeTemplate, anchorId, getCodeColor]);

  const [nodes, setNodes, onNodesChange] = useNodesState<CodeNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync state with memoized data
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  // Sync hovered state
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHovered: node.id === hoveredNodeId,
        },
      }))
    );

    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        animated: edge.source === hoveredNodeId || edge.target === hoveredNodeId ? true : (edge.animated ?? false),
        style: {
          ...edge.style,
          stroke: edge.source === hoveredNodeId || edge.target === hoveredNodeId ? "var(--text-secondary)" : "var(--border-strong)",
          opacity: edge.source === hoveredNodeId || edge.target === hoveredNodeId ? 0.8 : 0.2,
        },
      }))
    );
  }, [hoveredNodeId, setNodes, setEdges]);

  const onNodeMouseEnter = useCallback((_: any, node: Node) => setHoveredNodeId(node.id), []);
  const onNodeMouseLeave = useCallback(() => setHoveredNodeId(null), []);

  const onNodeClick = useCallback((_: any, node: Node) => {
    if (activeTemplate === "solar") {
      setAnchorId(node.id);
    }
  }, [activeTemplate]);

  const onNodeDoubleClick = useCallback((_: any, node: Node) => {
    const code = codes.find(c => c.id === node.id);
    if (code) {
      setDrawerCode(code);
      setDrawerOpen(true);
    }
  }, [codes]);

  const resetAll = () => {
    fitView();
    setSensitivity(1);
  };

  if (codes.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--text-muted)] italic">
        <Sparkles className="h-8 w-8 opacity-20" />
        <p className="text-sm">{t("analysis.interactiveNodeAnalysis")} için daha fazla kod gerekli.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative group/graph bg-[var(--bg-secondary)]/20 rounded-2xl border border-[var(--border)] overflow-hidden">
      {/* Local Export Button */}
      <div className="absolute top-4 left-4 z-50 flex gap-1 no-export">
        <div className="relative group/export-local">
          <button className="p-2 rounded-xl bg-[var(--bg-tertiary)]/80 border border-[var(--border)] hover:bg-[var(--surface-hover)] transition-all shadow-lg">
            <Download className="h-4 w-4" />
          </button>
          <div className="absolute top-full left-0 mt-2 w-32 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl py-1 invisible group-hover/export-local:visible opacity-0 group-hover/export-local:opacity-100 transition-all scale-95 group-hover/export-local:scale-100">
            <button onClick={() => handleExport("png")} className="w-full text-left px-4 py-1.5 text-[11px] font-semibold hover:bg-[var(--surface-hover)]">PNG</button>
            <button onClick={() => handleExport("jpeg")} className="w-full text-left px-4 py-1.5 text-[11px] font-semibold hover:bg-[var(--surface-hover)]">JPG</button>
          </div>
        </div>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeMouseEnter={onNodeMouseEnter}
        onNodeMouseLeave={onNodeMouseLeave}
        onNodeClick={onNodeClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={4}
      >
        <Background color="var(--border)" gap={20} size={1} />
        <Controls showInteractive={false} className="!bg-[var(--surface)] !border-[var(--border)] !fill-[var(--text-primary)]" />

        {/* Top Control Panel */}
        <Panel position="top-right" className="flex flex-col gap-2">
          <div className="bg-[var(--surface)]/80 backdrop-blur-md p-3 rounded-xl border border-[var(--border)] shadow-xl flex flex-col gap-3 min-w-[200px]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] flex items-center gap-1.5">
                <SlidersHorizontal className="h-3 w-3" />
                {t("analysis.sensitivity")}
              </span>
              <span className="text-[10px] font-mono bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border)]">
                {sensitivity}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseInt(e.target.value))}
              className="accent-[var(--text-primary)] h-1 w-full bg-[var(--border)] rounded-full appearance-none cursor-pointer"
            />

            <label className="flex items-center justify-between cursor-pointer group/label">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] group-hover/label:text-[var(--text-secondary)]">
                {t("analysis.clustering")}
              </span>
              <input
                type="checkbox"
                checked={useClustering}
                onChange={(e) => setUseClustering(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[var(--border)] bg-[var(--bg-tertiary)] checked:bg-[var(--text-primary)] appearance-none cursor-pointer transition-colors border-2"
              />
            </label>
          </div>

          <button
            onClick={resetAll}
            className="self-end p-2 bg-[var(--surface)]/80 backdrop-blur-md rounded-full border border-[var(--border)] shadow-lg hover:bg-[var(--surface-hover)] transition-colors text-[var(--text-secondary)]"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </Panel>

        {/* Theory Template Center */}
        <Panel position="top-center" className="mt-4">
          <div className="bg-[var(--bg-primary)]/90 backdrop-blur-xl border border-[var(--border)] rounded-full p-1 shadow-2xl flex items-center gap-1">
            {[
              { id: "standard", label: t("theory.standard"), icon: Settings2 },
              { id: "solar", label: t("theory.solar"), icon: Sun },
              { id: "case", label: t("theory.case"), icon: Users },
            ].map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setActiveTemplate(tmpl.id as TheoryTemplate)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-bold transition-all",
                  activeTemplate === tmpl.id
                    ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)]"
                )}
              >
                <tmpl.icon className="h-3.5 w-3.5" />
                {tmpl.label}
              </button>
            ))}
          </div>
        </Panel>

        {/* Template Specific Options */}
        <AnimatePresence>
          {activeTemplate !== "standard" && (
            <Panel position="bottom-center" className="mb-6">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-2xl min-w-[320px] max-w-[450px]"
              >
                {activeTemplate === "solar" ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-[11px] uppercase tracking-wider mb-1">
                      <Sun className="h-4 w-4 text-yellow-500" />
                      {t("theory.anchor")}
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                      {t("theory.anchorHint")}
                    </p>
                    <div className="mt-2 flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)]">
                      <span className="text-[11px] font-mono text-[var(--text-secondary)]">
                        {anchorId ? codes.find(c => c.id === anchorId)?.name : "Seçim yok..."}
                      </span>
                      {anchorId && (
                        <button onClick={() => setAnchorId(null)} className="p-1 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-muted)]">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-[var(--text-primary)] font-bold text-[11px] uppercase tracking-wider">
                        <Users className="h-4 w-4 text-blue-500" />
                        {t("theory.cases")}
                      </div>
                      <span className="text-[10px] font-mono bg-[var(--accent-subtle)] text-[var(--accent)] px-1.5 py-0.5 rounded">
                        {selectedDocIds.length} / {documents.length}
                      </span>
                    </div>

                    <div className="relative group/doc-sel">
                      <button
                        onClick={() => setIsDocSelectorOpen(!isDocSelectorOpen)}
                        className="w-full flex items-center justify-between p-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border)] text-[11px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all"
                      >
                        <span className="truncate">
                          {selectedDocIds.length === 0 ? t("synthesis.allDocs") : `${selectedDocIds.length} ${t("analysis.docs")}`}
                        </span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isDocSelectorOpen && "rotate-180")} />
                      </button>

                      {isDocSelectorOpen && (
                        <div className="absolute bottom-full left-0 w-full mb-2 max-h-[200px] overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-2xl p-1 z-[100] custom-scrollbar">
                          {documents.map(doc => (
                            <button
                              key={doc.id}
                              onClick={() => {
                                setSelectedDocIds(prev => prev.includes(doc.id) ? prev.filter(id => id !== doc.id) : [...prev, doc.id]);
                              }}
                              className={cn(
                                "w-full text-left px-3 py-1.5 rounded-md text-[11px] transition-colors flex items-center justify-between",
                                selectedDocIds.includes(doc.id) ? "bg-[var(--accent-subtle)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                              )}
                            >
                              <span className="truncate">{doc.name}</span>
                              {selectedDocIds.includes(doc.id) && <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </Panel>
          )}
        </AnimatePresence>

        <Panel position="bottom-left" className="mb-4 ml-2 pointer-events-none">
          <div className="flex flex-col gap-1">
            <h4 className="text-[11px] font-bold uppercase tracking-tighter text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-yellow-500/50" />
              Theory Engine
            </h4>
            <p className="text-[9px] text-[var(--text-muted)] font-medium leading-tight flex items-center gap-1.5">
              <Info className="h-3 w-3" />
              {t("analysis.nodeHint")}
            </p>
          </div>
        </Panel>
      </ReactFlow>

      {/* Deep Dive Drawer */}
      {drawerCode && (
        <SegmentDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          code={drawerCode}
          filterDocIds={activeTemplate === "case" && selectedDocIds.length > 0 ? selectedDocIds : undefined}
        />
      )}
    </div>
  );
}

export function CoOccurrenceGraph(props: CoOccurrenceGraphProps) {
  return (
    <ReactFlowProvider>
      <CoOccurrenceGraphInner {...props} />
    </ReactFlowProvider>
  );
}
