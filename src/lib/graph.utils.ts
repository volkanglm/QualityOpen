import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from "d3-force";
import type { Code, Segment } from "@/types";

export interface GraphNode {
    id: string;
    code: Code;
    x: number;
    y: number;
    count: number;
    cluster?: string;
}

export interface GraphEdge {
    id: string;
    source: string;
    target: string;
    weight: number;
}

/**
 * Calculates co-occurrence metrics and simulates node positions using d3-force.
 */
export function computeGraphData(
    codes: Code[],
    segments: Segment[],
    width: number,
    height: number,
    options: { anchorId?: string | null } = {}
) {
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

    const nodes: any[] = codes.map((c) => ({
        id: c.id,
        code: c,
        count: freq.get(c.id) ?? 0,
        x: c.id === options.anchorId ? width / 2 : Math.random() * width,
        y: c.id === options.anchorId ? height / 2 : Math.random() * height,
        fx: c.id === options.anchorId ? width / 2 : undefined, // Fix anchor in center
        fy: c.id === options.anchorId ? height / 2 : undefined,
    }));

    const edges: any[] = [];
    coMap.forEach((weight, key) => {
        const [source, target] = key.split(":");
        if (codes.some(c => c.id === source) && codes.some(c => c.id === target)) {
            edges.push({ id: key, source, target, weight });
        }
    });

    // Run a short simulation to get stable positions
    const simulation = forceSimulation(nodes)
        .force("link", forceLink(edges).id((d: any) => d.id).distance((d: any) => {
            // If one end is the anchor, pull closer based on weight
            if (options.anchorId && (d.source.id === options.anchorId || d.target.id === options.anchorId)) {
                return 120 - (d.weight * 15);
            }
            return 180 - (d.weight * 10);
        }))
        .force("charge", forceManyBody().strength((d: any) => {
            // Anchor exerts more repulsion to push non-connected far away
            return d.id === options.anchorId ? -1000 : -250;
        }))
        .force("collide", forceCollide().radius(50))
        .force("center", forceCenter(width / 2, height / 2))
        .stop();

    for (let i = 0; i < 200; i++) simulation.tick();

    return { nodes, edges };
}

/**
 * Simple community detection logic based on edge weights.
 */
export function assignClusters(nodes: GraphNode[], edges: GraphEdge[]) {
    let clusterId = 0;
    const nodeToCluster = new Map<string, string>();
    const visited = new Set<string>();

    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const currentCluster = `cluster-${clusterId++}`;
            const queue = [node.id];
            visited.add(node.id);

            while (queue.length > 0) {
                const currentId = queue.shift()!;
                nodeToCluster.set(currentId, currentCluster);

                edges.forEach(edge => {
                    const neighborId = edge.source === currentId ? (typeof edge.target === 'string' ? edge.target : (edge.target as any).id)
                        : edge.target === currentId ? (typeof edge.source === 'string' ? edge.source : (edge.source as any).id)
                            : null;
                    if (neighborId && !visited.has(neighborId) && edge.weight > 0) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                });
            }
        }
    });

    return nodes.map(n => ({
        ...n,
        cluster: nodeToCluster.get(n.id)
    }));
}
