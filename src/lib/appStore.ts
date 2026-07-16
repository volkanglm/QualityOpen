/** True only in the Mac App Store build (set via VITE_APP_STORE=true at build time). */
export const IS_APP_STORE = import.meta.env.VITE_APP_STORE === "true";
