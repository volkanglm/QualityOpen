import { useCallback, useMemo, useEffect, useRef } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

function uuid() {
  return crypto.randomUUID();
}
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Plus, Database, Download, FileText, Image as ImageIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";

// Custom Nodes
import { MemoNodeComponent } from "@/components/canvas/MemoNode";
import { CodeNodeComponent } from "@/components/canvas/CodeNode";
import { QuoteNodeComponent } from "@/components/canvas/QuoteNode";
import { AssetsPanel } from "@/components/canvas/AssetsPanel";

// Custom Edges
import { LabeledEdgeComponent } from "@/components/canvas/LabeledEdge";

const nodeTypes = {
  memo: MemoNodeComponent,
  code: CodeNodeComponent,
  quote: QuoteNodeComponent,
};

const edgeTypes = {
  labeled: LabeledEdgeComponent,
};

function ConceptMapInner() {
  const t = useT();
  const { activeProjectId } = useAppStore();
  const { conceptMaps, addConceptMap, updateConceptMapNodes, updateMapEdges } = useProjectStore();
  const { screenToFlowPosition } = useReactFlow();

  // Ref to track what we've already synced to avoid infinite loops
  const lastSyncedMapId = useRef<string | null>(null);

  // Find or create a map for this project
  const currentMap = useMemo(() => {
    return conceptMaps.find((m) => m.projectId === activeProjectId);
  }, [conceptMaps, activeProjectId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(currentMap?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(currentMap?.edges || []);

  // Sync LOCAL STATE from store ONLY when the map ID actually changes (project switch)
  useEffect(() => {
    if (currentMap && currentMap.id !== lastSyncedMapId.current) {
      setNodes(currentMap.nodes || []);
      setEdges(currentMap.edges || []);
      lastSyncedMapId.current = currentMap.id;
    } else if (activeProjectId && !currentMap) {
      // Create initial map if none exists
      addConceptMap(activeProjectId, t("canvas.untitled"));
    }
  }, [currentMap, activeProjectId, addConceptMap, setNodes, setEdges, t]);

  // Persist LOCAL STATE to store (with a small delay/debounce in effect)
  useEffect(() => {
    if (!currentMap?.id) return;
    
    const timeout = setTimeout(() => {
      updateConceptMapNodes(currentMap.id, nodes);
    }, 100); // 100ms debounce
    
    return () => clearTimeout(timeout);
  }, [nodes, currentMap?.id, updateConceptMapNodes]);

  useEffect(() => {
    if (!currentMap?.id) return;
    
    const timeout = setTimeout(() => {
      updateMapEdges(currentMap.id, edges);
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [edges, currentMap?.id, updateMapEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      const edgeId = uuid();
      const newEdge: any = {
        ...params,
        id: edgeId,
        type: "labeled",
        data: {
          label: "",
        }
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const appData = event.dataTransfer.getData("application/reactflow");
      if (!appData) return;

      const { nodeType, data } = JSON.parse(appData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: uuid(),
        type: nodeType,
        position: {
          x: position.x + (Math.random() * 20 - 10),
          y: position.y + (Math.random() * 20 - 10),
        },
        data: {
          ...data,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  const addNewNode = useCallback(() => {
    const id = uuid();
    const offset = Math.floor(Math.random() * 60) - 30;
    const newNode = {
      id,
      position: { x: window.innerWidth / 4 + offset, y: window.innerHeight / 4 + offset },
      data: { 
        label: "",
      },
      type: "memo",
    };
    setNodes((nds) => nds.concat(newNode));
  }, [setNodes]);

  const exportImage = useCallback(async (format: "png" | "pdf") => {
    const element = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!element) return;

    try {
      // Temporarily hide background dots for cleaner export
      const background = document.querySelector(".react-flow__background") as HTMLElement;
      if (background) background.style.display = "none";

      const canvas = await html2canvas(element, {
        backgroundColor: "#0a0a0a", // App's dark background
        scale: 2,
        useCORS: true,
        logging: false,
      });

      if (background) background.style.display = "block";

      if (format === "png") {
        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${currentMap?.name || "concept-map"}.png`;
        link.href = image;
        link.click();
      } else {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "l" : "p",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${currentMap?.name || "concept-map"}.pdf`);
      }
    } catch (err) {
      console.error("Export failed:", err);
    }
  }, [currentMap?.name]);

  if (!activeProjectId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        {t("analysis.noProject")}
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-[var(--bg-primary)]">
      {/* Toolbar */}
      <div className="flex h-12 items-center justify-between border-b border-[var(--border-subtle)] px-4 bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--accent)]" />
          <h2 className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">
            {currentMap?.name || t("canvas.untitled")}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={t("canvas.exportPng") || "Export PNG"}>
            <Button variant="ghost" size="sm" onClick={() => exportImage("png")}>
              <ImageIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
          <Tooltip content={t("canvas.exportPdf") || "Export PDF"}>
            <Button variant="ghost" size="sm" onClick={() => exportImage("pdf")}>
              <FileText className="h-4 w-4" />
            </Button>
          </Tooltip>
          <div className="w-px h-4 mx-1 bg-[var(--border)]" />
          <Button variant="primary" size="sm" onClick={addNewNode}>
            <Plus className="h-4 w-4" />
            {t("canvas.newIdea")}
          </Button>
        </div>
      </div>

      {/* Canvas Area with Assets Panel */}
      <div className="relative flex flex-1 overflow-hidden">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode="dark"
            fitView
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
            <Controls />
            <MiniMap 
              style={{ background: "var(--bg-secondary)", border: "1px solid var(--border-subtle)" }}
              nodeStrokeColor="var(--accent)"
              nodeColor="var(--surface)"
              maskColor="rgba(0,0,0,0.3)"
            />
          </ReactFlow>
        </div>
        <AssetsPanel />
      </div>
    </div>
  );
}

export function ConceptMapBoard() {
  return (
    <ReactFlowProvider>
      <ConceptMapInner />
    </ReactFlowProvider>
  );
}
