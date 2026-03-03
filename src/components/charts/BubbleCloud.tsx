import { useMemo, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Code } from "@/types";

export interface BubbleItem {
  code: Code;
  count: number;
}

interface PlacedCircle {
  id: string;
  x: number;
  y: number;
  r: number;
  data: BubbleItem;
}

// ─── Force-directed bubble packing ───────────────────────────────────────────

function computeLayout(
  items: BubbleItem[],
  width: number,
  height: number,
): PlacedCircle[] {
  if (items.length === 0) return [];

  const maxCount = Math.max(...items.map((i) => i.count), 1);
  const minR = Math.max(20, Math.min(38, (Math.min(width, height) * 0.08)));
  const maxR = Math.min(width, height) * 0.20;
  const cx = width / 2;
  const cy = height / 2;

  type Node = PlacedCircle & { vx: number; vy: number };

  const nodes: Node[] = items.map((item, i) => {
    const ratio = items.length === 1 ? 1 : (item.count / maxCount) ** 0.55;
    const angle = (i / items.length) * Math.PI * 2;
    const spread = Math.min(width, height) * 0.26;
    return {
      id: item.code.id,
      r: minR + ratio * (maxR - minR),
      data: item,
      x: cx + Math.cos(angle) * spread,
      y: cy + Math.sin(angle) * spread,
      vx: 0,
      vy: 0,
    };
  });

  const ITERS = 320;
  const GRAVITY = 0.038;
  const PADDING = 7;

  for (let iter = 0; iter < ITERS; iter++) {
    const decay = Math.max(0.45, 1 - iter / ITERS);

    nodes.forEach((n) => { n.vx = 0; n.vy = 0; });

    // Gravity toward center
    nodes.forEach((n) => {
      n.vx += (cx - n.x) * GRAVITY;
      n.vy += (cy - n.y) * GRAVITY;
    });

    // Pairwise repulsion / overlap correction
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const minD = a.r + b.r + PADDING;
        if (dist < minD) {
          const f = (minD - dist) / dist * 0.55;
          a.vx -= dx * f;
          a.vy -= dy * f;
          b.vx += dx * f;
          b.vy += dy * f;
        }
      }
    }

    nodes.forEach((n) => {
      n.x += n.vx * decay;
      n.y += n.vy * decay;
      n.x = Math.max(n.r + 8, Math.min(width - n.r - 8, n.x));
      n.y = Math.max(n.r + 8, Math.min(height - n.r - 8, n.y));
    });
  }

  return nodes.map(({ vx: _vx, vy: _vy, ...rest }) => rest);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface BubbleCloudProps {
  items: BubbleItem[];
  zoom?: number;
}

export function BubbleCloud({ items, zoom = 1.0 }: BubbleCloudProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 600, height: 420 });
  const [hovered, setHovered] = useState<string | null>(null);

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

  const placed = useMemo(
    () => computeLayout(items, size.width, size.height),
    [items, size.width, size.height],
  );

  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {items.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Henüz kod uygulanmadı.
          </p>
        </div>
      ) : (
        <svg width={size.width} height={size.height} style={{ display: "block" }}>
          {placed.map((circle, i) => {
            const { code, count } = circle.data;
            const isHov = hovered === code.id;
            const opacity = 0.50 + (count / maxCount) * 0.50;
            const radius = circle.r * zoom;
            const fontSize = Math.max(9, Math.min(14 * zoom, radius * 0.42));
            const label = code.name.length > Math.floor(radius / 5.5)
              ? code.name.slice(0, Math.floor(radius / 5.5)) + "…"
              : code.name;

            return (
              <motion.g
                key={code.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  delay: i * 0.045,
                  type: "spring",
                  stiffness: 260,
                  damping: 22,
                }}
                style={{ transformOrigin: `${circle.x}px ${circle.y}px`, cursor: "default" }}
                onHoverStart={() => setHovered(code.id)}
                onHoverEnd={() => setHovered(null)}
              >
                {/* Glow ring on hover */}
                <AnimatePresence>
                  {isHov && (
                    <motion.circle
                      key="glow"
                      cx={circle.x}
                      cy={circle.y}
                      initial={{ r: radius, opacity: 0 }}
                      animate={{ r: radius + 10 * zoom, opacity: 0.18 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      fill={code.color}
                    />
                  )}
                </AnimatePresence>

                {/* Main circle */}
                <motion.circle
                  cx={circle.x}
                  cy={circle.y}
                  r={radius}
                  fill={code.color}
                  fillOpacity={opacity * 0.20}
                  stroke={code.color}
                  strokeOpacity={isHov ? 0.9 : opacity * 0.55}
                  strokeWidth={isHov ? 2 * zoom : 1.5 * zoom}
                  animate={{ r: isHov ? radius + 3 * zoom : radius }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                />

                {/* Code name */}
                {circle.r > 22 && (
                  <text
                    x={circle.x}
                    y={circle.y - (circle.r > 34 ? 7 : 2)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={code.color}
                    fontSize={fontSize}
                    fontWeight="600"
                    fontFamily="Inter, system-ui, sans-serif"
                    opacity={isHov ? 1 : 0.88}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {label}
                  </text>
                )}

                {/* Count */}
                {circle.r > 28 && (
                  <text
                    x={circle.x}
                    y={circle.y + (circle.r > 34 ? 10 : 13)}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={code.color}
                    fontSize={Math.max(8, fontSize - 3)}
                    fontFamily="'SF Mono','Fira Code',monospace"
                    opacity={isHov ? 0.9 : 0.65}
                    style={{ pointerEvents: "none", userSelect: "none" }}
                  >
                    {count}
                  </text>
                )}

                {/* Hover tooltip */}
                <AnimatePresence>
                  {isHov && (
                    <motion.g
                      key="tooltip"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <rect
                        x={circle.x - 52}
                        y={circle.y - circle.r - 36}
                        width={104}
                        height={26}
                        rx={6}
                        fill="var(--bg-secondary)"
                        stroke="var(--border)"
                        strokeWidth={1}
                        filter="drop-shadow(0 4px 12px rgba(0,0,0,0.3))"
                      />
                      <text
                        x={circle.x}
                        y={circle.y - circle.r - 20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="var(--text-primary)"
                        fontSize={11}
                        fontWeight="500"
                        fontFamily="Inter, system-ui, sans-serif"
                        style={{ pointerEvents: "none", userSelect: "none" }}
                      >
                        {code.name} · {count} segment
                      </text>
                    </motion.g>
                  )}
                </AnimatePresence>
              </motion.g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
