import { useEffect } from "react";
import { useAppStore } from "@/store/app.store";

export function ShortcutEngine() {
    const {
        activeDocumentId,
        activeProjectId,
        setCommandPaletteOpen,
        setLeftCollapsed,
        setRightCollapsed,
        activeSelection
    } = useAppStore();

    // The store imports are here to be used later if needed for advanced features

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Don't trigger shortcuts if user is typing in an input/textarea
            const activeElement = document.activeElement;
            const isInput =
                activeElement instanceof HTMLInputElement ||
                activeElement instanceof HTMLTextAreaElement ||
                (activeElement as HTMLElement)?.isContentEditable;

            // CMD+1, CMD+2, CMD+3: Panel Toggles
            if ((e.metaKey || e.ctrlKey) && !isInput) {
                if (e.key === "1") {
                    e.preventDefault();
                    setLeftCollapsed((prev: boolean) => !prev);
                } else if (e.key === "2") {
                    e.preventDefault();
                    // Reset panels to default reading view
                    setLeftCollapsed(() => true);
                    setRightCollapsed(() => true);
                } else if (e.key === "3") {
                    e.preventDefault();
                    setRightCollapsed((prev: boolean) => !prev);
                }
            }

            // CMD+K: Command Palette (Phase 2 Placeholder logic)
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                setCommandPaletteOpen(true);
            }

            // CMD+F: Local Search Focus
            if ((e.metaKey || e.ctrlKey) && e.key === "f") {
                // Only override if we are in the main app surface (not native browser find)
                // For now we don't preventDefault to allow native CMD+F as fallback if needed,
                // but let's actually prevent default to enforce custom search over active doc:
                e.preventDefault();

                // Find our custom search input and focus it
                const searchInput = document.getElementById("local-search-input");
                if (searchInput) {
                    searchInput.focus();
                } else {
                    // If search bar is hidden, toggle it via state somehow.
                    // In our CenterPanel doc header, we hide/show search with local state.
                    // For global access, we might need to dispatch an event or use the store.
                    window.dispatchEvent(new CustomEvent("open-local-search"));
                }
            }

            // Quick Assign Code: 'C' or 'Enter' when text is selected
            if (!isInput && activeSelection) {
                if (e.key === "c" || e.key === "C" || e.key === "Enter") {
                    e.preventDefault();

                    // Trigger the ContextCodeMenu at the selection position
                    // We can do this by dispatching a custom DOM event caught by CenterPanel
                    const rect = window.getSelection()?.getRangeAt(0).getBoundingClientRect();
                    if (rect) {
                        window.dispatchEvent(new CustomEvent("open-code-menu", {
                            detail: {
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                pos: activeSelection
                            }
                        }));
                    }
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        activeDocumentId,
        activeProjectId,
        activeSelection,
        setCommandPaletteOpen,
        setLeftCollapsed,
        setRightCollapsed
    ]);

    return null; // This is a logic-only component
}
