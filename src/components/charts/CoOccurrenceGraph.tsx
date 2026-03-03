import { useMemo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Code, Segment } from "@/types";

interface CoOccurrenceGraphProps {
  codes: Code[];
  segments: Segment[];
  zoom?: number;
}

interface LayoutNode {
  id: string;
  code: Code;
  x: number;
  y: number;
  r: number;
  count: number;
}

interface LayoutEdge {
  id: string;
  ai: number;
  bi: number;
  weight: number;
}

// ─── Force layout ─────────────────────────────────────────────────────────────

function computeForceLayout(
  codes: Code[],
  edges: LayoutEdge[],
  freq: Map<string, number>,
  width: number,
  height: number,
  zoom: number = 1.0,
): LayoutNode[] {
  if (codes.length === 0) return [];

  const maxFreq = Math.max(...Array.from(freq.values()), 1);
  const maxEdgeW = Math.max(...edges.map((e) => e.weight), 1);
  const cx = width / 2;
  const cy = height / 2;

  type Node = LayoutNode & { vx: number; vy: number };

  const nodes: Node[] = codes.map((c, i) => {
    const angle = (i / codes.length) * Math.PI * 2;
    const spread = Math.min(width, height) * 0.30;
    return {
      id: c.id,
      code: c,
      x: cx + Math.cos(angle) * spread * zoom,
      y: cy + Math.sin(angle) * spread * zoom,
      r: (13 + ((freq.get(c.id) ?? 0) / maxFreq) * 18) * zoom,
      count: freq.get(c.id) ?? 0,
      vx: 0,
      vy: 0,
    };
  });

  const REPULSION = 3200;
  const ATTRACTION = 0.012;
  const DAMPING = 0.82;

  for (let iter = 0; iter < 280; iter++) {
    nodes.forEach((n) => { n.vx = 0; n.vy = 0; });

    // Gravity to center
    nodes.forEach((n) => {
      n.vx += (cx - n.x) * 0.012;
      n.vy += (cy - n.y) * 0.012;
    });

    // Repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d2 = dx * dx + dy * dy || 1;
        const f = REPULSION / d2;
        const d = Math.sqrt(d2);
        a.vx -= (dx / d) * f;
        a.vy -= (dy / d) * f;
        b.vx += (dx / d) * f;
        b.vy += (dy / d) * f;
      }
    }

    // Spring attraction along edges
    edges.forEach(({ ai, bi, weight }) => {
      const a = nodes[ai], b = nodes[bi];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const target = (80 + (1 - weight / maxEdgeW) * 120) * zoom;
      const delta = len - target;
      const str = ATTRACTION * delta;
      a.vx += (dx / len) * str;
      a.vy += (dy / len) * str;
      b.vx -= (dx / len) * str;
      b.vy -= (dy / len) * str;
    });

    nodes.forEach((n) => {
      n.x += n.vx * DAMPING;
      n.y += n.vy * DAMPING;
      n.x = Math.max(n.r + 12, Math.min(width - n.r - 12, n.x));
      n.y = Math.max(n.r + 12, Math.min(height - n.r - 12, n.y));
    });
  }

  return nodes.map(({ vx: _vx, vy: _vy, ...rest }) => rest);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CoOccurrenceGraph({ codes, segments, zoom = 1.0 }: CoOccurrenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 420 });
  const [hovered, setHov] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width: Math.max(200, width), height: Math.max(160, height) });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Compute co-occurrence
  const { edges, freq } = useMemo(() => {
    const freq = new Map<string, number>();
    const coMap = new Map<string, number>();

    segments.forEach((seg) => {
      seg.codeIds.forEach((cid) => {
        freq.set(cid, (freq.get(cid) ?? 0) + 1);
      });
      const ids = [...seg.codeIds].sort();
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const key = `${ids[i]}:${ids[j]}`;
          coMap.set(key, (coMap.get(key) ?? 0) + 1);
        }
      }
    });

    const edges: LayoutEdge[] = [];
    coMap.forEach((weight, key) => {
      const [aId, bId] = key.split(":");
      const ai = codes.findIndex((c) => c.id === aId);
      const bi = codes.findIndex((c) => c.id === bId);
      if (ai !== -1 && bi !== -1) {
        edges.push({ id: key, ai, bi, weight });
      }
    });

    return { edges, freq };
  }, [codes, segments]);

  const nodes = useMemo(
    () => computeForceLayout(codes, edges, freq, size.width, size.height, zoom),
    [codes, edges, freq, size.width, size.height, zoom],
  );

  const maxEdgeW = Math.max(...edges.map((e) => e.weight), 1);

  if (codes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Ağ için birden fazla kod gerekli.
        </p>
      </div>
    );
  }

  if (edges.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Henüz birlikte kullanılan kod çifti yok.
        </p>
        <p className="text-xs" style={{ color: "var(--text-disabled)" }}>
          Aynı segmente birden fazla kod ata.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <svg width={size.width} height={size.height} style={{ display: "block" }}>
        <defs>
          {nodes.map((n) => (
            <radialGradient key={`grad-${n.id}`} id={`grad-${n.id}`}>
              <stop offset="0%" stopColor={n.code.color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={n.code.color} stopOpacity={0.08} />
            </radialGradient>
          ))}
        </defs>

        {/* Edges */}
        {edges.map((edge) => {
          const a = nodes[edge.ai];
          const b = nodes[edge.bi];
          if (!a || !b) return null;

          const isRelated = hovered
            ? a.id === hovered || b.id === hovered
            : true;

          const opacity = isRelated
            ? 0.18 + (edge.weight / maxEdgeW) * 0.65
            : 0.04;

          const strokeW = 1 + (edge.weight / maxEdgeW) * 3.5;

          // Color: blend between the two node colors via midpoint
          const aColor = a.code.color;
          const bColor = b.code.color;

          return (
            <motion.line
              key={edge.id}
              initial={{ opacity: 0 }}
              animate={{ opacity }}
              transition={{ delay: 0.25, duration: 0.4 }}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={`url(#edge-${edge.id})`}
              strokeWidth={strokeW}
              strokeLinecap="round"
            >
              <defs>
                <linearGradient id={`edge-${edge.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} gradientUnits="userSpaceOnUse">
                  <stop offset="0%" stopColor={aColor} />
                  <stop offset="100%" stopColor={bColor} />
                </linearGradient>
              </defs>
            </motion.line>
          );
        })}

        {/* Edge weight labels on thick edges */}
        {edges.map((edge) => {
          const a = nodes[edge.ai];
          const b = nodes[edge.bi];
          if (!a || !b) return null;
          if (edge.weight < 2) return null;
          return (
            <motion.text
              key={`lbl-${edge.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: hovered && a.id !== hovered && b.id !== hovered ? 0.1 : 0.55 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              x={(a.x + b.x) / 2}
              y={(a.y + b.y) / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={9}
              fontFamily="'SF Mono','Fira Code',monospace"
              fill="var(--text-muted)"
              style={{ pointerEvents: "none", userSelect: "none" }}
            >
              {edge.weight}
            </motion.text>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const isHov = hovered === node.id;
          const isDim = hovered && !isHov;

          return (
            <motion.g
              key={node.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: isDim ? 0.38 : 1,
                scale: 1,
              }}
              transition={{
                delay: i * 0.05,
                type: "spring",
                stiffness: 260,
                damping: 22,
              }}
              style={{ transformOrigin: `${node.x}px ${node.y}px`, cursor: "default" }}
              onHoverStart={() => setHov(node.id)}
              onHoverEnd={() => setHov(null)}
            >
              {/* Glow */}
              <AnimatePresence>
                {isHov && (
                  <motion.circle
                    key="glow"
                    cx={node.x}
                    cy={node.y}
                    initial={{ r: node.r, opacity: 0 }}
                    animate={{ r: node.r + 12, opacity: 0.20 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    fill={node.code.color}
                  />
                )}
              </AnimatePresence>

              {/* Fill circle */}
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill={`url(#grad-${node.id})`}
              />
              {/* Stroke */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill="none"
                stroke={node.code.color}
                strokeWidth={isHov ? 2.5 : 1.5}
                strokeOpacity={isHov ? 0.95 : 0.60}
                animate={{ r: isHov ? node.r + 2 : node.r }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
              />

              {/* Label */}
              <text
                x={node.x}
                y={node.y + node.r + 13}
                textAnchor="middle"
                fill={node.code.color}
                fontSize={11}
                fontWeight="600"
                fontFamily="Inter, system-ui, sans-serif"
                opacity={isHov ? 1 : 0.80}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                {node.code.name.length > 12
                  ? node.code.name.slice(0, 11) + "…"
                  : node.code.name}
              </text>

              {/* Count inside node */}
              {node.r > 16 && (
                <text
                  x={node.x}
                  y={node.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={node.code.color}
                  fontSize={Math.max(8, node.r * 0.52)}
                  fontWeight="700"
                  fontFamily="'SF Mono','Fira Code',monospace"
                  opacity={0.80}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {node.count}
                </text>
              )}

              {/* Hover tooltip */}
              <AnimatePresence>
                {isHov && (
                  <motion.g
                    key="tip"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.14 }}
                  >
                    <rect
                      x={node.x - 60}
                      y={node.y - node.r - 38}
                      width={120}
                      height={26}
                      rx={7}
                      fill="var(--bg-secondary)"
                      stroke="var(--border)"
                      strokeWidth={1}
                      filter="drop-shadow(0 4px 12px rgba(0,0,0,0.3))"
                    />
                    <text
                      x={node.x}
                      y={node.y - node.r - 22}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="var(--text-primary)"
                      fontSize={11}
                      fontWeight="500"
                      fontFamily="Inter, system-ui, sans-serif"
                      style={{ pointerEvents: "none", userSelect: "none" }}
                    >
                      {node.code.name} · {node.count} seg
                    </text>
                  </motion.g>
                )}
              </AnimatePresence>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}
