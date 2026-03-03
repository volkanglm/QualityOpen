import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { Project, Document, Code, Segment, Memo, ID } from "@/types";
import { CODE_COLORS } from "@/lib/constants";
import { writeSnapshotToDb } from "@/lib/db";

function uuid() {
  return crypto.randomUUID();
}

interface ProjectStore {
  projects: Project[];
  documents: Document[];
  codes: Code[];
  segments: Segment[];
  memos: Memo[];

  // Projects
  createProject: (name: string, description?: string) => Project;
  updateProject: (id: ID, patch: Partial<Project>) => void;
  deleteProject: (id: ID) => void;

  // Documents
  createDocument: (projectId: ID, name: string, type?: Document["type"]) => Document;
  updateDocument: (id: ID, patch: Partial<Document>) => void;
  deleteDocument: (id: ID) => void;

  // Codes
  createCode: (projectId: ID, name: string, parentId?: ID) => Code;
  updateCode: (id: ID, patch: Partial<Code>) => void;
  deleteCode: (id: ID) => void;

  // Codes — reorder (drag-and-drop)
  reorderCodes: (projectId: ID, activeId: ID, overId: ID) => void;
  // Move a code to a new parent and position (tree DnD)
  moveCode: (codeId: ID, newParentId: ID | undefined, targetId: ID | undefined, position: "before" | "after") => void;

  // Segments
  addSegment: (seg: Omit<Segment, "id" | "createdAt">) => Segment;
  addSegments: (segs: Omit<Segment, "id" | "createdAt">[]) => Segment[];
  removeSegmentCode: (segId: ID, codeId: ID) => void;
  deleteSegment: (id: ID) => void;

  // Memos
  createMemo: (projectId: ID, title: string) => Memo;
  updateMemo: (id: ID, patch: Partial<Memo>) => void;
  deleteMemo: (id: ID) => void;

  // Backup
  importBackup: (payload: { projects: Project[]; documents: Document[]; codes: Code[]; segments: Segment[]; memos: Memo[] }) => void;
}

export const useProjectStore = create<ProjectStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        projects: [],
        documents: [],
        codes: [],
        segments: [],
        memos: [],

        createProject: (name, description) => {
          const project: Project = {
            id: uuid(),
            name,
            description,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: CODE_COLORS[Math.floor(Math.random() * CODE_COLORS.length)],
          };
          set((s) => ({ projects: [...s.projects, project] }));
          return project;
        },
        updateProject: (id, patch) =>
          set((s) => ({
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
            ),
          })),
        deleteProject: (id) =>
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            documents: s.documents.filter((d) => d.projectId !== id),
            codes: s.codes.filter((c) => c.projectId !== id),
            segments: s.segments.filter((sg) => sg.projectId !== id),
            memos: s.memos.filter((m) => m.projectId !== id),
          })),

        createDocument: (projectId, name, type = "document") => {
          // Demo Mode: Limit guest users to 2 documents TOTAL per project
          // Use a safer way to check auth state that doesn't rely on synchronous require during ESM initialization
          let isGuest = false;
          try {
            const authState = (window as any).__AUTH_STATE__ || {};
            isGuest = !authState.user;
          } catch (e) {
            // Fallback: if we can't determine, assume not guest or check localStorage
            isGuest = !localStorage.getItem("qo_auth_cache");
          }

          if (isGuest) {
            const count = get().documents.filter((d) => d.projectId === projectId).length;
            if (count >= 2) {
              throw new Error("Demo sürümünde proje başına en fazla 2 belge ekleyebilirsiniz. Sınırsız kullanım için lütfen giriş yapın.");
            }
          }

          const doc: Document = {
            id: uuid(),
            projectId,
            name,
            content: "",
            type,
            tags: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            wordCount: 0,
          };
          set((s) => ({ documents: [...s.documents, doc] }));
          return doc;
        },
        updateDocument: (id, patch) =>
          set((s) => ({
            documents: s.documents.map((d) =>
              d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
            ),
          })),
        deleteDocument: (id) =>
          set((s) => ({
            documents: s.documents.filter((d) => d.id !== id),
            segments: s.segments.filter((sg) => sg.documentId !== id),
          })),

        createCode: (projectId, name, parentId) => {
          const allCodes = get().codes;
          const usedColors = allCodes.filter((c) => c.projectId === projectId).map((c) => c.color);
          const color =
            CODE_COLORS.find((c) => !usedColors.includes(c)) ??
            CODE_COLORS[allCodes.length % CODE_COLORS.length];
          const code: Code = {
            id: uuid(),
            projectId,
            name,
            color,
            parentId,
            createdAt: Date.now(),
            usageCount: 0,
          };
          set((s) => ({ codes: [...s.codes, code] }));
          return code;
        },
        updateCode: (id, patch) =>
          set((s) => ({ codes: s.codes.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
        deleteCode: (id) =>
          set((s) => ({
            codes: s.codes.filter((c) => c.id !== id),
            segments: s.segments.map((sg) => ({
              ...sg,
              codeIds: sg.codeIds.filter((cid) => cid !== id),
            })),
          })),
        reorderCodes: (projectId, activeId, overId) =>
          set((s) => {
            const proj = s.codes.filter((c) => c.projectId === projectId);
            const rest = s.codes.filter((c) => c.projectId !== projectId);
            const from = proj.findIndex((c) => c.id === activeId);
            const to = proj.findIndex((c) => c.id === overId);
            if (from === -1 || to === -1) return s;
            const reordered = [...proj];
            const [item] = reordered.splice(from, 1);
            reordered.splice(to, 0, item);
            return { codes: [...rest, ...reordered] };
          }),

        moveCode: (codeId, newParentId, targetId, position) =>
          set((s) => {
            const codes = [...s.codes];
            const fromIdx = codes.findIndex((c) => c.id === codeId);
            if (fromIdx === -1) return s;

            const [code] = codes.splice(fromIdx, 1);
            const updated = { ...code, parentId: newParentId };

            if (targetId) {
              const toIdx = codes.findIndex((c) => c.id === targetId);
              if (toIdx === -1) {
                codes.push(updated);
              } else {
                const finalIdx = position === "after" ? toIdx + 1 : toIdx;
                codes.splice(finalIdx, 0, updated);
              }
            } else {
              codes.push(updated);
            }
            return { codes };
          }),

        addSegment: (seg) => {
          const newSeg: Segment = { ...seg, id: uuid(), createdAt: Date.now() };
          set((s) => {
            const updatedCodes = s.codes.map((c) =>
              seg.codeIds.includes(c.id) ? { ...c, usageCount: (c.usageCount ?? 0) + 1 } : c
            );
            return { segments: [...s.segments, newSeg], codes: updatedCodes };
          });
          return newSeg;
        },
        addSegments: (segs) => {
          if (segs.length === 0) return [];
          const now = Date.now();
          const newSegs: Segment[] = segs.map(seg => ({ ...seg, id: uuid(), createdAt: now }));
          set((s) => {
            const codeUsageCounts: Record<string, number> = {};
            for (const seg of segs) {
              for (const cid of seg.codeIds) {
                codeUsageCounts[cid] = (codeUsageCounts[cid] || 0) + 1;
              }
            }
            const updatedCodes = s.codes.map((c) =>
              codeUsageCounts[c.id] ? { ...c, usageCount: (c.usageCount ?? 0) + codeUsageCounts[c.id] } : c
            );
            return { segments: [...s.segments, ...newSegs], codes: updatedCodes };
          });
          return newSegs;
        },
        removeSegmentCode: (segId, codeId) =>
          set((s) => ({
            segments: s.segments.map((sg) =>
              sg.id === segId ? { ...sg, codeIds: sg.codeIds.filter((c) => c !== codeId) } : sg
            ),
          })),
        deleteSegment: (id) =>
          set((s) => ({ segments: s.segments.filter((sg) => sg.id !== id) })),

        createMemo: (projectId, title) => {
          const memo: Memo = {
            id: uuid(),
            projectId,
            title,
            content: "",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          set((s) => ({ memos: [...s.memos, memo] }));
          return memo;
        },
        updateMemo: (id, patch) =>
          set((s) => ({
            memos: s.memos.map((m) =>
              m.id === id ? { ...m, ...patch, updatedAt: Date.now() } : m
            ),
          })),
        deleteMemo: (id) => set((s) => ({ memos: s.memos.filter((m) => m.id !== id) })),

        importBackup: (payload) => {
          set({
            projects: payload.projects,
            documents: payload.documents,
            codes: payload.codes,
            segments: payload.segments,
            memos: payload.memos,
          });
        },
      }),
      { name: "qo-project-data" }
    )
  )
);

// ─── IndexedDB mirror + Drive sync trigger ────────────────────────────────────
// Debounced: waits 1.5s after last change before writing to IndexedDB / Drive.

let _dbTimer: number | undefined;

useProjectStore.subscribe(
  (s) => ({
    projects: s.projects,
    documents: s.documents,
    codes: s.codes,
    segments: s.segments,
    memos: s.memos,
  }),
  (snap) => {
    if (_dbTimer !== undefined) window.clearTimeout(_dbTimer);
    _dbTimer = window.setTimeout(async () => {
      // 1. Write to IndexedDB (offline-first)
      await writeSnapshotToDb(snap).catch(() => {/* silent */ });

      // 2. Trigger Drive sync if user is authenticated
      const { useAuthStore } = await import("@/store/auth.store");
      const { useSyncStore } = await import("@/store/sync.store");
      const { localFolderPath } = useAuthStore.getState();
      const token = useAuthStore.getState().accessToken;

      if (token) {
        useSyncStore.getState().syncNow(token).catch(() => {/* silent */ });
      }

      // 3. Trigger Local Folder sync if configured (Premium)
      if (localFolderPath) {
        try {
          const { syncDataToLocal } = await import("@/lib/localSync");
          await syncDataToLocal(localFolderPath, snap);
        } catch (err) {
          console.error("[LocalSync] Failed to sync to local folder:", err);
        }
      }
    }, 1500) as unknown as number;
  },
  { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
);
