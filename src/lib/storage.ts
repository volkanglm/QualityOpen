import { type PersistStorage, type StorageValue } from "zustand/middleware";
import { dbMetaGet, dbMetaSet, dbMetaDel } from "./db";

/**
 * Custom storage for Zustand's persist middleware that uses IndexedDB.
 * This is used to bypass the 5MB limit of localStorage.
 */
export const idbStorage: PersistStorage<any> = {
  getItem: async (name: string): Promise<StorageValue<any> | null> => {
    try {
      const value = await dbMetaGet<StorageValue<any>>(name);
      
      // Migration from localStorage: if not in IndexedDB, check localStorage
      if (!value) {
        const localValue = localStorage.getItem(name);
        if (localValue) {
          console.log(`[Storage] Migrating ${name} from localStorage to IndexedDB`);
          try {
            const parsed = JSON.parse(localValue) as StorageValue<any>;
            // We don't save it here; the store will save it to IndexedDB on its first write.
            return parsed;
          } catch (e) {
            console.error(`[Storage] Failed to parse localStorage value for ${name}`, e);
          }
        }
      }
      
      return value ?? null;
    } catch (err) {
      console.error(`[Storage] Failed to get ${name} from IndexedDB:`, err);
      return null;
    }
  },
  
  setItem: async (name: string, value: StorageValue<any>): Promise<void> => {
    try {
      await dbMetaSet(name, value);
      
      // Cleanup localStorage after successful migration to IndexedDB
      if (localStorage.getItem(name)) {
        localStorage.removeItem(name);
        console.log(`[Storage] Cleaned up ${name} from localStorage after IndexedDB save`);
      }
    } catch (err) {
      console.error(`[Storage] Failed to set ${name} in IndexedDB:`, err);
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    try {
      await dbMetaDel(name);
      localStorage.removeItem(name);
    } catch (err) {
      console.error(`[Storage] Failed to remove ${name} from IndexedDB:`, err);
    }
  },
};
