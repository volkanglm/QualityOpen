import { memo, useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Code, Segment } from "@/types";
import { useT } from "@/lib/i18n";

interface ThematicNetworkProps {
    codes: Code[];
    segments: Segment[];
    zoom?: number;
}

export const ThematicNetwork = memo(({ codes, segments, zoom = 1.0 }: ThematicNetworkProps) => {
    const t = useT();
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const [nodePositions, setNodePositions] = useState<Record<string, { x: number, y: number }>>({});

    useEffect(() => {
        if (!containerRef.current) return;
        const update = () => {
            const w = containerRef.current?.clientWidth || 0;
            const h = containerRef.current?.clientHeight || 0;
            setDimensions({ width: w, height: h });
        };
        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    // Initialize positions only when codes or dimensions change significantly, but NOT on zoom
    useEffect(() => {
        if (dimensions.width === 0) return;

        const centerX = dimensions.width / 2;
        const centerY = dimensions.height / 2;

        const newPositions: Record<string, { x: number, y: number }> = {};
        codes.slice(0, 12).forEach((code, i) => {
            // If we already have a position, keep it (or scale it relatively if needed)
            // But for now, let's just initialize once.
            if (!nodePositions[code.id]) {
                const angle = (i / Math.min(codes.length, 12)) * Math.PI * 2;
                const radius = Math.min(dimensions.width, dimensions.height) * 0.25;
                newPositions[code.id] = {
                    x: centerX + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
                    y: centerY + Math.sin(angle) * radius + (Math.random() - 0.5) * 50
                };
            }
        });

        if (Object.keys(newPositions).length > 0) {
            setNodePositions(prev => ({ ...prev, ...newPositions }));
        }
    }, [codes, dimensions.width, dimensions.height]);

    const displayNodes = useMemo(() => {
        return codes.slice(0, 12).map(code => ({
            id: code.id,
            name: code.name,
            color: code.color,
            ...(nodePositions[code.id] || { x: dimensions.width / 2, y: dimensions.height / 2 })
        }));
    }, [codes, nodePositions, dimensions]);

    const edges = useMemo(() => {
        const connections: { source: string; target: string; weight: number }[] = [];
        const seen = new Set<string>();

        segments.forEach(seg => {
            if (seg.codeIds.length > 1) {
                const relevantIds = seg.codeIds.filter(id => displayNodes.some(n => n.id === id));
                for (let i = 0; i < relevantIds.length; i++) {
                    for (let j = i + 1; j < relevantIds.length; j++) {
                        const pair = [relevantIds[i], relevantIds[j]].sort().join("-");
                        if (!seen.has(pair)) {
                            connections.push({ source: relevantIds[i], target: relevantIds[j], weight: 1 });
                            seen.add(pair);
                        }
                    }
                }
            }
        });
        return connections;
    }, [segments, displayNodes]);

    const handleNodeDrag = (id: string, x: number, y: number) => {
        setNodePositions(prev => ({
            ...prev,
            [id]: { x, y }
        }));
    };

    return (
        <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-[var(--bg-secondary)]/20 rounded-lg">
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
                <h3
                    className="font-bold uppercase tracking-widest text-[var(--text-muted)]"
                    style={{ fontSize: Math.max(8, 10 * zoom) }}
                >
                    {t("analysis.thematicNetwork")}
                </h3>
                <p
                    className="text-[var(--text-disabled)] uppercase mt-1"
                    style={{ fontSize: Math.max(7, 9 * zoom) }}
                >
                    {t("analysis.relationalAnalysis")}
                </p>
            </div>

            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <AnimatePresence>
                    {edges.map((edge) => (
                        <Edge
                            key={`${edge.source}-${edge.target}`}
                            source={nodePositions[edge.source]}
                            target={nodePositions[edge.target]}
                            zoom={zoom}
                        />
                    ))}
                </AnimatePresence>
            </svg>

            <div className="absolute inset-0 pointer-events-none">
                {displayNodes.map((node) => (
                    <Node
                        key={node.id}
                        node={node}
                        zoom={zoom}
                        onDrag={(x, y) => handleNodeDrag(node.id, x, y)}
                    />
                ))}
            </div>

            <div
                className="absolute bottom-4 right-4 text-[var(--text-disabled)] font-mono italic text-right pointer-events-none"
                style={{ fontSize: Math.max(6, 8 * zoom) }}
            >
                {t("analysis.interactiveNodeAnalysis")}<br />
                {t("analysis.nodeHint")}
            </div>
        </div>
    );
});

const Node = ({ node, zoom, onDrag }: { node: any, zoom: number, onDrag: (x: number, y: number) => void }) => {
    return (
        <motion.div
            drag
            dragMomentum={false}
            onDrag={(_, info) => {
                onDrag(node.x + info.delta.x, node.y + info.delta.y);
            }}
            initial={false}
            animate={{
                x: node.x,
                y: node.y,
                scale: zoom
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30, mass: 0.5 }}
            className="absolute cursor-grab active:cursor-grabbing z-20 group pointer-events-auto"
            style={{ left: 0, top: 0, x: node.x, y: node.y }}
        >
            <div
                className="px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/90 backdrop-blur-sm font-medium text-[var(--text-secondary)] shadow-xl group-hover:border-[var(--text-muted)] transition-colors whitespace-nowrap"
                style={{
                    boxShadow: `0 0 ${15 * zoom}px ${node.color}15`,
                    fontSize: 11 // Scale via parent motion.div
                }}
            >
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: node.color }} />
                    {node.name}
                </div>
            </div>
        </motion.div>
    );
};

const Edge = ({ source, target, zoom }: { source?: { x: number, y: number }, target?: { x: number, y: number }, zoom: number }) => {
    if (!source || !target) return null;

    // Offset to center of node pills
    // Base pill is approx 80-120px wide, 30px high. 
    // Center approx: x + 50, y + 15
    const sX = source.x + 50 * zoom;
    const sY = source.y + 15 * zoom;
    const tX = target.x + 50 * zoom;
    const tY = target.y + 15 * zoom;

    const midX = (sX + tX) / 2;
    const midY = (sY + tY) / 2;
    const path = `M ${sX} ${sY} Q ${midX} ${sY} ${midX} ${midY} T ${tX} ${tY}`;

    return (
        <motion.path
            d={path}
            stroke="var(--border)"
            strokeWidth={1.5 * zoom}
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 0.5 }}
        />
    );
};

ThematicNetwork.displayName = "ThematicNetwork";
