import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id:       string;
  message:  string;
  type:     ToastType;
  duration: number;
}

interface ToastStore {
  toasts: Toast[];
  push:   (message: string, type?: ToastType, duration?: number) => void;
  remove: (id: string) => void;
}

export const useToastStore = create<ToastStore>()((set) => ({
  toasts: [],

  push(message, type = "success", duration = 3200) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    set((s) => ({ toasts: [...s.toasts, { id, message, type, duration }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  remove(id) {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },
}));
