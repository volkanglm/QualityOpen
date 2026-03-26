import { PersistStorage, StorageValue } from "zustand/middleware";
import { openDB } from "idb";

const DB_NAME = "qualityopen-storage";
const STORE_NAME = "keyvalue";

const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

export const idbStorage: PersistStorage<any> = {
  getItem: async (name: string): Promise<StorageValue<any> | null> => {
    const value = await (await dbPromise).get(STORE_NAME, name);
    if (!value) return null;
    return typeof value === "string" ? JSON.parse(value) : value;
  },
  setItem: async (name: string, value: StorageValue<any>): Promise<void> => {
    await (await dbPromise).put(STORE_NAME, value, name);
  },
  removeItem: async (name: string): Promise<void> => {
    await (await dbPromise).delete(STORE_NAME, name);
  },
};
