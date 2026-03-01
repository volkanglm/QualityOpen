import { useState, useEffect } from "react";

export interface NetworkState {
  online: boolean;
}

/**
 * Reactive wrapper around navigator.onLine.
 * Reacts to online/offline browser events so components
 * re-render the moment connectivity changes.
 */
export function useNetwork(): NetworkState {
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline  = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { online };
}
