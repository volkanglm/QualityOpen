import { useCallback, useMemo, useEffect, useRef, useState } from "react";
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
import { save, ask } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

function uuid() {
  return crypto.randomUUID();
}
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useLicenseStore } from "@/store/license.store";
import { useToastStore } from "@/store/toast.store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/Button";
import { Plus, Database, FileText, Image as ImageIcon, RotateCcw } from "lucide-react";
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
  const theme = useAppStore((s) => s.theme);
  const { activeProjectId } = useAppStore();
  const { conceptMaps, addConceptMap, updateConceptMapNodes, updateMapEdges, renameConceptMap, resetConceptMap } = useProjectStore();
  const { screenToFlowPosition } = useReactFlow();
  const pushToast = useToastStore((s) => s.push);

  // Ref to track what we've already synced to avoid infinite loops
  const lastSyncedMapId = useRef<string | null>(null);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

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

  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      
      const { isPro, openModal } = useLicenseStore.getState();
      if (!isPro && nodes.length >= 5) {
        openModal();
        pushToast(t("project.limit.mapNodeCount"), "error");
        return;
      }

      console.log("Drop DETECTED!");
      event.preventDefault();
      event.stopPropagation();

      // IMPORTANT: getData MUST be called synchronously during the event tick in WebKit
      const appData = event.dataTransfer.getData("application/reactflow") || 
                      event.dataTransfer.getData("text") ||
                      event.dataTransfer.getData("text/plain");

      if (!appData) {
        console.warn("No drag data found in drop event");
        import("@/store/toast.store").then((m) => {
          m.useToastStore.getState().push("Drop detected but no data", "error");
        });
        return;
      }

      // Start async part for toasts and processing
      (async () => {
        const { useToastStore } = await import("@/store/toast.store");
        try {
          const payload = JSON.parse(appData);
          const { nodeType, data } = payload;
          
          if (!nodeType) {
            console.warn("No nodeType in payload:", payload);
            useToastStore.getState().push("Invalid drop data", "error");
            return;
          }

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
              content: "",
              colorIndex: 0,
              ...data,
            },
          };

          setNodes((nds) => nds.concat(newNode));
          useToastStore.getState().push(`${nodeType.toUpperCase()} added to map`, "info");
        } catch (e) {
          console.error("Failed to parse dropped data:", e);
          useToastStore.getState().push("Failed to add node", "error");
        }
      })();
    },
    [nodes, screenToFlowPosition, t, pushToast]
  );

  // Failsafe Window Listener for D&D — Primary Capture
  useEffect(() => {
    const handleGlobalDrop = (e: DragEvent) => {
      // If we already handled it via React onDrop, this might be redundant but safe
      if (e.defaultPrevented) return;
      
      const appData = e.dataTransfer?.getData("application/reactflow") || 
                      e.dataTransfer?.getData("text") ||
                      e.dataTransfer?.getData("text/plain");
      
      if (!appData) return;

      try {
        const payload = JSON.parse(appData);
        const { nodeType } = payload;
        if (!nodeType) return;

        const pane = document.querySelector(".react-flow__pane");
        if (!pane) return;
        
        const rect = pane.getBoundingClientRect();
        if (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        ) return;

        const customEvent = new CustomEvent("manual-drop", { 
          detail: { appData, clientX: e.clientX, clientY: e.clientY } 
        });
        window.dispatchEvent(customEvent);
        
        e.preventDefault();
        e.stopPropagation();
      } catch (err) {}
    };

    const handleManualDrop = (e: any) => {
      const { appData, clientX, clientY } = e.detail;
      
      const { isPro, openModal } = useLicenseStore.getState();
      if (!isPro && nodes.length >= 5) {
        openModal();
        import("@/store/toast.store").then((m) => {
          m.useToastStore.getState().push(t("project.limit.mapNodeCount"), "error");
        });
        return;
      }

      try {
        const { nodeType, data } = JSON.parse(appData);
        const position = screenToFlowPosition({ x: clientX, y: clientY });
        const newNode = {
          id: uuid(),
          type: nodeType,
          position: {
            x: position.x + (Math.random() * 20 - 10),
            y: position.y + (Math.random() * 20 - 10),
          },
          data: { 
            content: "",
            colorIndex: 0,
            ...data 
          },
        };
        setNodes((nds) => nds.concat(newNode));
        import("@/store/toast.store").then(m => m.useToastStore.getState().push(`${nodeType.toUpperCase()} added`, "info"));
      } catch (err) {}
    };

    window.addEventListener("drop", handleGlobalDrop, true); // Use capture phase
    window.addEventListener("manual-drop", handleManualDrop);
    window.addEventListener("dragover", (e) => e.preventDefault());

    return () => {
      window.removeEventListener("drop", handleGlobalDrop, true);
      window.removeEventListener("manual-drop", handleManualDrop);
    };
  }, [screenToFlowPosition, setNodes, nodes.length, t]); // Added nodes.length and t to dependencies for stability

  const addNewNode = useCallback(() => {
    const { isPro, openModal } = useLicenseStore.getState();
    if (!isPro && nodes.length >= 5) {
      openModal();
      pushToast(t("project.limit.mapNodeCount"), "error");
      return;
    }

    const id = uuid();
    const offset = Math.floor(Math.random() * 60) - 30;
    const colorIndex = Math.floor(Math.random() * 5); // Random color to start
    const newNode = {
      id,
      position: { x: window.innerWidth / 4 + offset, y: window.innerHeight / 4 + offset },
      data: { 
        label: t("canvas.newIdea"),
        content: "",
        colorIndex,
      },
      type: "memo",
    };
    setNodes((nds) => nds.concat(newNode));
  }, [nodes, setNodes, pushToast, t]);

  const onReset = useCallback(async () => {
    if (!currentMap?.id) return;
    
    const confirmed = await ask(
      t("canvas.confirmReset") || "Are you sure you want to reset the map? This will clear all nodes and edges.",
      {
        title: "QualityOpen",
        kind: "warning",
      }
    );

    if (confirmed === true) {
      resetConceptMap(currentMap.id);
      setNodes([]);
      setEdges([]);
    }
  }, [currentMap?.id, resetConceptMap, setNodes, setEdges, t]);

  const startEditing = () => {
    setTempTitle(currentMap?.name || t("canvas.untitled"));
    setIsEditingTitle(true);
  };

  const handleTitleBlur = () => {
    if (currentMap?.id && tempTitle.trim() && tempTitle !== currentMap.name) {
      renameConceptMap(currentMap.id, tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleBlur();
    } else if (e.key === "Escape") {
      setIsEditingTitle(false);
    }
  };

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

      const fileName = `${currentMap?.name || "concept-map"}.${format}`;
      const filePath = await save({
        filters: [{
          name: format.toUpperCase(),
          extensions: [format]
        }],
        defaultPath: fileName,
      });

      if (!filePath) return;

      if (format === "png") {
        const imageBase64 = canvas.toDataURL("image/png").split(",")[1];
        const bytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
        await writeFile(filePath, bytes);
      } else {
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "l" : "p",
          unit: "px",
          format: [canvas.width, canvas.height],
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        const pdfArrayBuffer = pdf.output("arraybuffer");
        await writeFile(filePath, new Uint8Array(pdfArrayBuffer));
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
          {isEditingTitle ? (
            <input
              autoFocus
              className="mt-0.5 bg-transparent text-sm font-semibold border-b border-[var(--accent)] outline-none text-[var(--text-primary)]"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
            />
          ) : (
            <h2 
              className="text-sm font-semibold tracking-tight text-[var(--text-primary)] cursor-pointer hover:text-[var(--accent)] transition-colors"
              onDoubleClick={startEditing}
              title="Double click to rename"
            >
              {currentMap?.name || t("canvas.untitled")}
            </h2>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content={t("canvas.reset") || "Reset Map"}>
            <Button variant="ghost" size="sm" onClick={onReset} className="text-[var(--text-tertiary)] hover:text-[var(--danger)]">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </Tooltip>
          <div className="w-px h-4 mx-1 bg-[var(--border)]" />
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
        <div 
          className="relative flex-1"
          onDragEnter={onDragEnter}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            proOptions={{ hideAttribution: true }}
            colorMode={theme as any}
            fitView
          >
            <Background variant={BackgroundVariant.Lines} gap={30} size={1} color={theme === "dark" ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
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
