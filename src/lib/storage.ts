import { type PersistStorage, type StorageValue } from "zustand/middleware";
import { dbMetaGet, dbMetaSet } from "./db";

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
          const parsed = JSON.parse(localValue) as StorageValue<any>;
          // We don't save it here; the store will save it to IndexedDB on its first write.
          return parsed;
        }
      }
      
      return value ?? null;
    } catch (err) {
      console.error(`[Storage] Failed to get ${name} from IndexedDB:`, err);
      // Fallback to localStorage on total failure? No, better to fail than have split data.
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
      // Very unlikely to hit quota in IndexedDB, but handle errors
      console.error(`[Storage] Failed to set ${name} in IndexedDB:`, err);
      
      // If IndexedDB fails (rare), we could fallback to localStorage as a last resort,
      // but only if it fits. For now, we stick to IndexedDB.
      if (err instanceof Error && err.name === 'QuotaExceededError') {
         // Even IndexedDB can theoretically hit a limit, but it's massive.
         console.warn("[Storage] Quota exceeded even in IndexedDB!");
      }
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    try {
      // Implementing delete via putting undefined or similar if dbMetaDel not available
      // For now, using null is usually enough or we can add dbMetaDel to db.ts
      await dbMetaSet(name, undefined);
      localStorage.removeItem(name);
    } catch (err) {
      console.error(`[Storage] Failed to remove ${name} from IndexedDB:`, err);
    }
  },
};
