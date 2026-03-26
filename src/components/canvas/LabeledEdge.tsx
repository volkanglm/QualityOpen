import { memo, useState, useCallback, useRef, useEffect } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Trash2, Palette } from "lucide-react";
import { CODE_COLORS } from "@/lib/constants";

export type LabeledEdgeData = {
  label?: string;
  edgeStyle?: "solid" | "dashed" | "dotted";
  color?: string;
};

export type LabeledEdge = Edge<LabeledEdgeData, "labeled">;

export const LabeledEdgeComponent = memo(
  (props: EdgeProps<LabeledEdge>) => {
    const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected, style = {}, markerEnd } = props;
    const t = useT();
    const { setEdges } = useReactFlow();
    const [editing, setEditing] = useState(false);
    const [showPalette, setShowPalette] = useState(false);
    const [label, setLabel] = useState(data?.label || "");
    const inputRef = useRef<HTMLInputElement>(null);

    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const onDoubleClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setEditing(true);
    }, []);

    const onBlur = useCallback(() => {
      setEditing(false);
      setEdges((eds) => 
        eds.map((e) => e.id === id ? { ...e, data: { ...e.data, label } } : e)
      );
    }, [id, label, setEdges]);

    const setEdgeStyle = useCallback((style: "solid" | "dashed" | "dotted") => {
      setEdges((eds) => 
        eds.map((e) => e.id === id ? { ...e, data: { ...e.data, edgeStyle: style } } : e)
      );
    }, [id, setEdges]);

    const setEdgeColor = useCallback((color?: string) => {
      setEdges((eds) => 
        eds.map((e) => e.id === id ? { ...e, data: { ...e.data, color } } : e)
      );
      setShowPalette(false);
    }, [id, setEdges]);

    const onDelete = useCallback(() => {
      setEdges((eds) => eds.filter((e) => e.id !== id));
    }, [id, setEdges]);

    useEffect(() => {
      if (editing && inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
      }
    }, [editing]);

    return (
      <>
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: selected ? "var(--accent)" : (data?.color || "var(--border)"),
            strokeWidth: selected ? 2.5 : 2,
            strokeDasharray: data?.edgeStyle === "dashed" ? "5,5" : data?.edgeStyle === "dotted" ? "2,2" : undefined,
            transition: "stroke 0.2s, stroke-width 0.2s",
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              zIndex: 1000,
            }}
            className="nodrag nopan"
            onDoubleClick={onDoubleClick}
          >
            {editing ? (
              <div className="flex flex-col gap-1 items-center">
                <input
                  ref={inputRef}
                  className="min-w-[80px] rounded border border-[var(--accent)] bg-[var(--surface)] px-1.5 py-1 text-[10px] font-bold text-[var(--text-primary)] outline-none shadow-xl"
                  placeholder={t("canvas.edgeLabel")}
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  onBlur={onBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onBlur();
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
                <div className="flex gap-1 rounded-md bg-[var(--surface)] p-1 border border-[var(--border)] shadow-md">
                  {(["solid", "dashed", "dotted"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setEdgeStyle(style)}
                      onMouseDown={(e) => e.preventDefault()}
                      className={cn(
                        "h-4 px-1 text-[8px] font-bold uppercase rounded transition-colors",
                        (data?.edgeStyle || "solid") === style 
                          ? "bg-[var(--accent)] text-white" 
                          : "hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                      )}
                    >
                      {style[0]}
                    </button>
                  ))}
                  <div className="w-px h-3 mx-0.5 bg-[var(--border)]" />
                  <button
                    onClick={() => setShowPalette(!showPalette)}
                    onMouseDown={(e) => e.preventDefault()}
                    className={cn(
                      "h-4 px-1 text-[8px] font-bold uppercase rounded hover:bg-[var(--surface-hover)]",
                      data?.color ? "text-[var(--accent)]" : "text-[var(--text-tertiary)]"
                    )}
                  >
                    <Palette className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={onDelete}
                    onMouseDown={(e) => e.preventDefault()}
                    className="h-4 px-1 text-[8px] font-bold uppercase rounded hover:bg-[var(--danger)] hover:text-white text-[var(--danger)]"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
                
                {showPalette && (
                  <div className="flex flex-wrap gap-1 mt-1 rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lg max-w-[120px]">
                    <button
                      className="h-3 w-3 rounded-full border border-[var(--border)] bg-transparent"
                      onClick={() => setEdgeColor(undefined)}
                      onMouseDown={(e) => e.preventDefault()}
                    />
                    {CODE_COLORS.slice(0, 8).map((c) => (
                      <button
                        key={c}
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: c }}
                        onClick={() => setEdgeColor(c)}
                        onMouseDown={(e) => e.preventDefault()}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              label && (
                <div className={cn(
                  "rounded-full bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold shadow-sm border transition-colors",
                  selected ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--border-subtle)] text-[var(--text-secondary)]"
                )}>
                  {label}
                </div>
              )
            )}
            {!label && selected && !editing && (
              <div className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-bold text-[var(--accent-fg)] cursor-pointer hover:scale-105 transition-transform" onClick={() => setEditing(true)}>
                + {t("canvas.edgeLabel")}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);
