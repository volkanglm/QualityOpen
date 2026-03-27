import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from "@xyflow/react";
import { X } from "lucide-react";

const EDGE_COLORS = ["#cbd5e1", "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export function LabeledEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}: EdgeProps) {
  const { setEdges } = useReactFlow();
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onColorChange = (color: string) => {
    setEdges((eds) =>
      eds.map((e) => (e.id === id ? { ...e, style: { ...e.style, stroke: color }, data: { ...e.data, color } } : e))
    );
  };

  const onStyleChange = (dash: string) => {
    setEdges((eds) =>
      eds.map((e) => (e.id === id ? { ...e, style: { ...e.style, strokeDasharray: dash }, data: { ...e.data, dash } } : e))
    );
  };

  const onThicknessChange = (width: number) => {
    setEdges((eds) =>
      eds.map((e) => (e.id === id ? { ...e, style: { ...e.style, strokeWidth: width }, data: { ...e.data, strokeWidth: width } } : e))
    );
  };

  const onDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEdges((eds) => eds.filter((edge) => edge.id !== id));
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          strokeWidth: (data?.strokeWidth as number) || 1 
        }} 
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 10,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex flex-col items-center gap-1 group"
        >
          {typeof data?.label === "string" && data.label && (
             <div className="px-2 py-1 bg-background border border-border-subtle rounded shadow-sm text-foreground font-medium text-[10px]">
                {data.label}
             </div>
          )}

          {selected && (
            <div className="flex flex-col items-center gap-1.5 p-1.5 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl scale-90 origin-top z-[1001]">
              <div className="flex items-center gap-1">
                {EDGE_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => onColorChange(c)}
                    className="w-3.5 h-3.5 rounded-full border border-white/10 hover:scale-110 transition-transform"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              
              <div className="flex items-center gap-2 border-t border-zinc-700/50 pt-1.5 w-full justify-center">
                 <button onClick={() => onStyleChange("")} className="w-4 h-1 bg-zinc-400 rounded-full" title="Solid" />
                 <button onClick={() => onStyleChange("4 4")} className="w-4 h-1 border-b border-dashed border-zinc-400" title="Dashed" />
                 <button onClick={() => onStyleChange("1 2")} className="w-4 h-1 border-b border-dotted border-zinc-400" title="Dotted" />
                 <div className="w-px h-3 bg-zinc-700 mx-1" />
                 <button onClick={() => onThicknessChange(1)} className="text-[9px] text-zinc-400 hover:text-white" title="Thin">1x</button>
                 <button onClick={() => onThicknessChange(2)} className="text-[9px] text-zinc-400 hover:text-white font-bold" title="Medium">2x</button>
                 <button onClick={() => onThicknessChange(4)} className="text-[9px] text-zinc-400 hover:text-white font-black" title="Thick">4x</button>
                 <div className="w-px h-3 bg-zinc-700 mx-1" />
                 <button 
                  onClick={onDelete}
                  className="p-1 hover:bg-red-500/20 hover:text-red-400 rounded transition-colors text-zinc-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
