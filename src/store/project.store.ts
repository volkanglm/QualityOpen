import { create } from "zustand";
import { persist, subscribeWithSelector } from "zustand/middleware";
import type { Project, Document, Code, Segment, Memo, Synthesis, ReflexivityEntry, AuditLogEntry, ProtocolVersion, ID } from "@/types";
import { CODE_COLORS } from "@/lib/constants";
import { writeSnapshotToDb } from "@/lib/db";
import { useLicenseStore } from "@/store/license.store";
import { t } from "@/lib/i18n";
import { useAppStore } from "@/store/app.store";
import { idbStorage } from "@/lib/storage";

function uuid() {
  return crypto.randomUUID();
}

interface ProjectStore {
  projects: Project[];
  documents: Document[];
  codes: Code[];
  segments: Segment[];
  memos: Memo[];
  syntheses: Synthesis[];
  reflexivityEntries: ReflexivityEntry[];
  auditLog: AuditLogEntry[];
  jarsProgress: Record<string, boolean>;
  protocolVersions: ProtocolVersion[];
  conceptMaps: any[];

  // Concept Maps
  addConceptMap: (projectId: ID, name: string) => any;
  updateConceptMapNodes: (id: ID, nodes: any[]) => void;
  updateMapEdges: (id: ID, edges: any[]) => void;
  renameConceptMap: (id: ID, name: string) => void;
  resetConceptMap: (id: ID) => void;
  deleteConceptMap: (id: ID) => void;

  // Reflexivity
  addReflexivityEntry: (projectId: ID, content: string) => ReflexivityEntry;
  updateReflexivityEntry: (id: ID, content: string) => void;
  deleteReflexivityEntry: (id: ID) => void;

  // Metadata
  updateDocumentMetadata: (id: ID, keyOrPatch: string | Record<string, string>, value?: string) => void;

  // JARS
  setJarsProgress: (projectId: ID, questionId: string, completed: boolean) => void;

  // Protocol
  addProtocolVersion: (projectId: ID, content: string, changeLog: string) => ProtocolVersion;
  deleteProtocolVersion: (id: ID) => void;

  // Settings
  graphSensitivity: number;
  setGraphSensitivity: (val: number) => void;
  textScale: number;
  setTextScale: (val: number) => void;

  // History (Undo/Redo) — delta-based, lightweight
  history: {
    past: StateDelta[];
    future: StateDelta[];
    _pendingBefore: ReturnType<typeof captureState> | null;
  };
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  // Projects
  createProject: (name: string, description?: string, projectType?: "primary" | "meta-synthesis") => Project;
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
  addSegment: (seg: Omit<Segment, "id" | "createdAt" | "projectId">) => Segment;
  addSegments: (segs: Omit<Segment, "id" | "createdAt" | "projectId">[]) => Segment[];
  removeSegmentCode: (segId: ID, codeId: ID) => void;
  deleteSegment: (id: ID) => void;
  toggleDisconfirming: (id: ID, note?: string) => void;

  // Memos
  createMemo: (projectId: ID, title: string) => Memo;
  updateMemo: (id: ID, patch: Partial<Memo>) => void;
  deleteMemo: (id: ID) => void;

  // Synthesis
  upsertSynthesis: (synth: Omit<Synthesis, "id" | "updatedAt">) => Synthesis;

  // Backup
  importBackup: (payload: { projects: Project[]; documents: Document[]; codes: Code[]; segments: Segment[]; memos: Memo[]; syntheses?: Synthesis[] }) => void;
  loadDemoProject: (payload: { project: Project; documents: Document[]; codes: Code[]; segments: Segment[]; memos: Memo[]; syntheses?: Synthesis[] }) => void;
}

const MAX_HISTORY = 30;

// Delta-based undo/redo: instead of full snapshots, store minimal diffs.
// Each entry captures only the changed fields (before/after).
interface StateDelta {
  before: Partial<Pick<ProjectStore, "projects" | "documents" | "codes" | "segments" | "memos" | "syntheses" | "reflexivityEntries" | "auditLog" | "jarsProgress" | "protocolVersions">>;
  after:  Partial<Pick<ProjectStore, "projects" | "documents" | "codes" | "segments" | "memos" | "syntheses" | "reflexivityEntries" | "auditLog" | "jarsProgress" | "protocolVersions">>;
}

function captureState(state: ProjectStore): StateDelta["before"] {
  return {
    projects:   state.projects,
    documents:  state.documents,
    codes:      state.codes,
    segments:   state.segments,
    memos:      state.memos,
    syntheses:  state.syntheses,
    reflexivityEntries: state.reflexivityEntries,
    auditLog:   state.auditLog,
    jarsProgress: state.jarsProgress,
    protocolVersions: state.protocolVersions,
  };
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
        syntheses: [],
        reflexivityEntries: [],
        auditLog: [],
        jarsProgress: {},
        protocolVersions: [],
        conceptMaps: [],

        graphSensitivity: 1,
        setGraphSensitivity: (val) => set({ graphSensitivity: val }),
        textScale: 1,
        setTextScale: (val) => set({ textScale: Math.max(0.5, Math.min(2, val)) }),

        history: {
          past: [],
          future: [],
          _pendingBefore: null,
        },

        // pushHistory: call BEFORE mutating state (captures "before" snapshot).
        // The actual delta is committed after the mutation via the next call.
        // For simplicity: capture full before-state but only store if changed.
        pushHistory: () => {
          const state = get();
          const before = captureState(state);
          // Store as pending; after the mutation we commit the delta
          set((s) => ({
            history: {
              ...s.history,
              _pendingBefore: before,
              future: [], // clear redo stack on new action
            },
          }));

          // Use microtask to capture "after" state post-mutation
          queueMicrotask(() => {
            const { history } = get();
            if (!history._pendingBefore) return;
            const after = captureState(get());
            const delta: StateDelta = { before: history._pendingBefore, after };
            set((s) => ({
              history: {
                past: [delta, ...s.history.past].slice(0, MAX_HISTORY),
                future: s.history.future,
                _pendingBefore: null,
              },
            }));
          });
        },

        undo: () => {
          const { history } = get();
          if (history.past.length === 0) return;
          const [delta, ...rest] = history.past;
          const currentAfter = captureState(get());
          set({
            ...delta.before,
            history: {
              past: rest,
              future: [{ before: delta.before, after: currentAfter }, ...history.future].slice(0, MAX_HISTORY),
              _pendingBefore: null,
            },
          });
        },

        redo: () => {
          const { history } = get();
          if (history.future.length === 0) return;
          const [delta, ...rest] = history.future;
          const currentBefore = captureState(get());
          set({
            ...delta.after,
            history: {
              past: [{ before: currentBefore, after: delta.after }, ...history.past].slice(0, MAX_HISTORY),
              future: rest,
              _pendingBefore: null,
            },
          });
        },

        createProject: (name, description, projectType = "primary") => {
          const project: Project = {
            id: uuid(),
            name,
            description,
            projectType,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            color: CODE_COLORS[Math.floor(Math.random() * CODE_COLORS.length)],
          };
          set((s) => ({ projects: [...s.projects, project] }));
          return project;
        },
        updateProject: (id, patch) => {
          get().pushHistory();
          set((s) => ({
            projects: s.projects.map((p) =>
              p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p
            ),
          }));
        },
        deleteProject: (id) => {
          get().pushHistory();
          set((s) => ({
            projects: s.projects.filter((p) => p.id !== id),
            documents: s.documents.filter((d) => d.projectId !== id),
            codes: s.codes.filter((c) => c.projectId !== id),
            segments: s.segments.filter((sg) => sg.projectId !== id),
            memos: s.memos.filter((m) => m.projectId !== id),
            syntheses: s.syntheses.filter((sy) => sy.projectId !== id),
            protocolVersions: s.protocolVersions.filter((pv) => pv.projectId !== id),
          }));
        },

        createDocument: (projectId, name, type = "document") => {
          get().pushHistory();
          const { isPro, openModal } = useLicenseStore.getState();

          if (!isPro) {
            const count = get().documents.filter((d) => d.projectId === projectId).length;
            if (count >= 3) {
              openModal();
              const lang = useAppStore.getState().language;
              throw new Error(t("project.limit.docCount", lang));
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
        updateDocument: (id, patch) => {
          // Don't push history for content updates to avoid spamming history with keystrokes
          // unless it's a major change or we want to support undo for text
          // For now, let's only push history for property changes or when specifically requested
          const isContentOnly = Object.keys(patch).length === 1 && "content" in patch;
          if (!isContentOnly) get().pushHistory();
          
          set((s) => ({
            documents: s.documents.map((d) =>
              d.id === id ? { ...d, ...patch, updatedAt: Date.now() } : d
            ),
          }));
        },
        updateDocumentMetadata: (id, keyOrPatch, value) => {
          get().pushHistory();
          set((s) => ({
            documents: s.documents.map((d) => {
              if (d.id === id) {
                const metadata = { ...(d.metadata || {}) };
                if (typeof keyOrPatch === "string") {
                  metadata[keyOrPatch] = value as string;
                } else {
                  Object.assign(metadata, keyOrPatch);
                }
                return { ...d, metadata, updatedAt: Date.now() };
              }
              return d;
            })
          }));
        },

        addProtocolVersion: (projectId, content, changeLog) => {
          const newVersion: ProtocolVersion = {
            id: uuid(),
            projectId,
            date: Date.now(),
            content,
            changeLog,
          };
          set((s) => ({ protocolVersions: [...s.protocolVersions, newVersion] }));
          return newVersion;
        },
        deleteProtocolVersion: (id) => {
          set((s) => ({ protocolVersions: s.protocolVersions.filter((pv) => pv.id !== id) }));
        },
        deleteDocument: (id) => {
          get().pushHistory();
          set((s) => ({
            documents: s.documents.filter((d) => d.id !== id),
            segments: s.segments.filter((sg) => sg.documentId !== id),
          }));
        },

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
          const audit: AuditLogEntry = { id: uuid(), projectId, timestamp: Date.now(), action: "CREATE_CODE", targetId: code.id, details: `Created code '${name}'` };
          set((s) => ({ codes: [...s.codes, code], auditLog: [...s.auditLog, audit] }));
          return code;
        },
        updateCode: (id, patch) => {
          get().pushHistory();
          set((s) => {
            const oldCode = s.codes.find(c => c.id === id);
            let details = "";
            if (oldCode && patch.name && oldCode.name !== patch.name) {
              details = `Name changed from '${oldCode.name}' to '${patch.name}'`;
            } else if (patch.description !== undefined) {
              details = 'Description updated';
            }
            const audit: AuditLogEntry = { id: uuid(), projectId: oldCode?.projectId || "", timestamp: Date.now(), action: "UPDATE_CODE", targetId: id, details };
            return {
              codes: s.codes.map((c) => (c.id === id ? { ...c, ...patch } : c)),
              auditLog: oldCode && details ? [...s.auditLog, audit] : s.auditLog
            };
          });
        },
        deleteCode: (id) => {
          get().pushHistory();
          set((s) => {
            const oldCode = s.codes.find(c => c.id === id);
            const audit: AuditLogEntry = { id: uuid(), projectId: oldCode?.projectId || "", timestamp: Date.now(), action: "DELETE_CODE", targetId: id, details: `Deleted code '${oldCode?.name}'` };
            return {
              codes: s.codes.filter((c) => c.id !== id),
              segments: s.segments.map((sg) => ({
                ...sg,
                codeIds: sg.codeIds.filter((cid) => cid !== id),
              })),
              auditLog: oldCode ? [...s.auditLog, audit] : s.auditLog
            };
          });
        },
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
            
            const audit: AuditLogEntry = { id: uuid(), projectId: code.projectId, timestamp: Date.now(), action: "MOVE_CODE", targetId: code.id, details: `Moved under parent '${newParentId || "root"}'` };

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
            return { codes, auditLog: [...s.auditLog, audit] };
          }),

        addSegment: (seg) => {
          get().pushHistory();
          const { activeProjectId } = (window as any).useAppStore?.getState() || {};
          const newSeg: Segment = { ...seg, id: uuid(), createdAt: Date.now(), projectId: activeProjectId || "" };
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
          get().pushHistory();
          const { activeProjectId } = (window as any).useAppStore?.getState() || {};
          const now = Date.now();
          const newSegs: Segment[] = segs.map(seg => ({ ...seg, id: uuid(), createdAt: now, projectId: activeProjectId || "" }));
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
        removeSegmentCode: (segId, codeId) => {
          get().pushHistory();
          set((s) => ({
            segments: s.segments.map((sg) =>
              sg.id === segId ? { ...sg, codeIds: sg.codeIds.filter((c) => c !== codeId) } : sg
            ),
          }));
        },
        deleteSegment: (id) => {
          get().pushHistory();
          set((s) => ({ segments: s.segments.filter((sg) => sg.id !== id) }));
        },
        toggleDisconfirming: (id, note) => {
          get().pushHistory();
          set((s) => ({
            segments: s.segments.map((sg) =>
              sg.id === id ? { ...sg, isDisconfirming: !sg.isDisconfirming, disconfirmingNote: note } : sg
            ),
          }));
        },

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
        deleteMemo: (id) => {
          get().pushHistory();
          set((s) => ({ memos: s.memos.filter((m) => m.id !== id) }));
        },

        upsertSynthesis: (synth) => {
          const syntheses = get().syntheses;
          const existing = syntheses.find(
            (s) =>
              s.projectId === synth.projectId &&
              s.codeId === synth.codeId &&
              s.propertyKey === synth.propertyKey &&
              s.propertyValue === synth.propertyValue
          );

          if (existing) {
            const updated = { ...existing, content: synth.content, updatedAt: Date.now() };
            set((s) => ({
              syntheses: s.syntheses.map((sy) => (sy.id === existing.id ? updated : sy)),
            }));
            return updated;
          } else {
            const newItem: Synthesis = { ...synth, id: uuid(), updatedAt: Date.now() };
            set((s) => ({ syntheses: [...s.syntheses, newItem] }));
            return newItem;
          }
        },

        addReflexivityEntry: (projectId, content) => {
          get().pushHistory();
          const entry: ReflexivityEntry = {
            id: uuid(),
            projectId,
            date: Date.now(),
            content,
            updatedAt: Date.now()
          };
          set((s) => ({ reflexivityEntries: [...s.reflexivityEntries, entry] }));
          return entry;
        },
        updateReflexivityEntry: (id, content) => {
          get().pushHistory();
          set((s) => ({
            reflexivityEntries: s.reflexivityEntries.map((e) => e.id === id ? { ...e, content, updatedAt: Date.now() } : e)
          }));
        },
        deleteReflexivityEntry: (id) => {
          get().pushHistory();
          set((s) => ({ reflexivityEntries: s.reflexivityEntries.filter((e) => e.id !== id) }));
        },
        setJarsProgress: (projectId, questionId, completed) => {
          set((s) => ({
            jarsProgress: { ...s.jarsProgress, [`${projectId}_${questionId}`]: completed }
          }));
        },

        importBackup: (payload) => {
          set({
            projects: payload.projects,
            documents: payload.documents,
            codes: payload.codes,
            segments: payload.segments,
            memos: payload.memos,
            syntheses: payload.syntheses ?? [],
            reflexivityEntries: payload.reflexivityEntries ?? [],
            conceptMaps: payload.conceptMaps ?? [],
            jarsProgress: payload.jarsProgress ?? {},
            auditLog: payload.auditLog ?? [],
          });
        },
        loadDemoProject: (payload) => {
          set({
            projects: [payload.project],
            documents: payload.documents,
            codes: payload.codes,
            segments: payload.segments,
            memos: payload.memos ?? [],
            syntheses: payload.syntheses ?? [],
            reflexivityEntries: payload.reflexivityEntries ?? [],
            conceptMaps: payload.conceptMaps ?? [],
            jarsProgress: payload.jarsProgress ?? {},
          });
        },

        addConceptMap: (projectId, name) => {
          const newMap = {
            id: uuid(),
            projectId,
            name,
            nodes: [],
            edges: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          set((s) => ({ conceptMaps: [...s.conceptMaps, newMap] }));
          return newMap;
        },
        updateConceptMapNodes: (id, nodes) => {
          set((s) => ({
            conceptMaps: s.conceptMaps.map((m) =>
              m.id === id ? { ...m, nodes, updatedAt: Date.now() } : m
            ),
          }));
        },
        updateMapEdges: (id, edges) => {
          set((s) => ({
            conceptMaps: s.conceptMaps.map((m) =>
              m.id === id ? { ...m, edges, updatedAt: Date.now() } : m
            ),
          }));
        },
        renameConceptMap: (id, name) => {
          set((s) => ({
            conceptMaps: s.conceptMaps.map((m) =>
              m.id === id ? { ...m, name, updatedAt: Date.now() } : m
            ),
          }));
        },
        resetConceptMap: (id) => {
          set((s) => ({
            conceptMaps: s.conceptMaps.map((m) =>
              m.id === id ? { ...m, nodes: [], edges: [], updatedAt: Date.now() } : m
            ),
          }));
        },
        deleteConceptMap: (id) => {
          set((s) => ({
            conceptMaps: s.conceptMaps.filter((m) => m.id !== id),
          }));
        },
      }),
      {
        name: "qo-project-data",
        storage: idbStorage,
        partialize: (state) => ({
          projects: state.projects,
          documents: state.documents,
          codes: state.codes,
          segments: state.segments,
          memos: state.memos,
          syntheses: state.syntheses,
          reflexivityEntries: state.reflexivityEntries,
          auditLog: state.auditLog,
          jarsProgress: state.jarsProgress,
          protocolVersions: state.protocolVersions,
          conceptMaps: state.conceptMaps,
          graphSensitivity: state.graphSensitivity,
          textScale: state.textScale,
        }),
      }
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
    conceptMaps: s.conceptMaps,
    reflexivityEntries: s.reflexivityEntries,
    jarsProgress: s.jarsProgress,
    syntheses: s.syntheses,
    auditLog: s.auditLog,
  }),
  (snap) => {
    if (_dbTimer !== undefined) window.clearTimeout(_dbTimer);
    _dbTimer = window.setTimeout(async () => {
      try {
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
      } catch (err) {
        console.error("[ProjectStore] Background sync task failed:", err);
      }
    }, 1500) as unknown as number;
  },
  {
    equalityFn: (a, b) => {
      // Shallow check on top-level arrays to avoid deep stringify of 5MB+ strings
      return a.projects === b.projects &&
        a.documents === b.documents &&
        a.codes === b.codes &&
        a.segments === b.segments &&
        a.memos === b.memos &&
        a.conceptMaps === b.conceptMaps &&
        a.reflexivityEntries === b.reflexivityEntries &&
        a.jarsProgress === b.jarsProgress &&
        a.syntheses === b.syntheses &&
        a.auditLog === b.auditLog;
    }
  }
);
