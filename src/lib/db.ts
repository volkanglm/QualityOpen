import { openDB, type IDBPDatabase } from "idb";
import type { Project, Document, Code, Segment, Memo } from "@/types";

// ─── Schema ──────────────────────────────────────────────────────────────────

export interface QoDb {
  projects:  { key: string; value: Project  };
  documents: { key: string; value: Document };
  codes:     { key: string; value: Code     };
  segments:  { key: string; value: Segment  };
  memos:     { key: string; value: Memo     };
  meta:      { key: string; value: unknown  };
}

const DB_NAME    = "qualityopen-db";
const DB_VERSION = 1;

let _db: IDBPDatabase<QoDb> | null = null;

async function getDb(): Promise<IDBPDatabase<QoDb>> {
  if (_db) return _db;
  _db = await openDB<QoDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      for (const store of [
        "projects",
        "documents",
        "codes",
        "segments",
        "memos",
        "meta",
      ] as const) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    },
  });
  return _db;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

type StoreName = keyof Omit<QoDb, "meta">;

export async function dbPutAll<T extends { id: string }>(
  store: StoreName,
  items: T[]
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(store, "readwrite");
  await Promise.all(items.map((item) => tx.store.put(item as never)));
  await tx.done;
}

export async function dbDeleteAll(store: StoreName): Promise<void> {
  const db = await getDb();
  await db.clear(store);
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await getDb();
  return db.getAll(store) as Promise<T[]>;
}

// ─── Snapshot: write entire app state to IndexedDB ───────────────────────────

export interface AppSnapshot {
  projects:  Project[];
  documents: Document[];
  codes:     Code[];
  segments:  Segment[];
  memos:     Memo[];
}

export async function writeSnapshotToDb(snap: AppSnapshot): Promise<void> {
  await Promise.all([
    dbPutAll("projects",  snap.projects),
    dbPutAll("documents", snap.documents),
    dbPutAll("codes",     snap.codes),
    dbPutAll("segments",  snap.segments),
    dbPutAll("memos",     snap.memos),
  ]);
}

export async function readSnapshotFromDb(): Promise<AppSnapshot> {
  const [projects, documents, codes, segments, memos] = await Promise.all([
    dbGetAll<Project>("projects"),
    dbGetAll<Document>("documents"),
    dbGetAll<Code>("codes"),
    dbGetAll<Segment>("segments"),
    dbGetAll<Memo>("memos"),
  ]);
  return { projects, documents, codes, segments, memos };
}

// ─── Meta store (last sync time, etc.) ───────────────────────────────────────

export async function dbMetaGet<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const row = await db.get("meta", key) as { id: string; value: T } | undefined;
  return row?.value;
}

export async function dbMetaSet<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.put("meta", { id: key, value } as never);
}
