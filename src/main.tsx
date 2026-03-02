console.log("[Boot] main.tsx entry point hit.");
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Fatal error fallback — visible even without DevTools
function showFatal(err: unknown) {
  const msg = err instanceof Error ? `${err.message}\n\n${err.stack ?? ""}` : String(err);
  document.body.style.cssText = "margin:0;padding:20px;background:#09090b;color:#ef4444;font-family:monospace;font-size:12px;white-space:pre-wrap;word-break:break-all;";
  document.body.textContent = "QualityOpen — Fatal Boot Error\n\n" + msg;
}

try {
  const rootEl = document.getElementById("root");
  if (!rootEl) throw new Error("#root element missing from DOM");
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} catch (err) {
  console.error("[Boot] ReactDOM.createRoot failed:", err);
  showFatal(err);
}
