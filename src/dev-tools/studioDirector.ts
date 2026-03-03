import html2canvas from "html2canvas";
import { useAppStore } from "@/store/app.store";
import { useProjectStore } from "@/store/project.store";
import { useToastStore } from "@/store/toast.store";

/**
 * Capture screenshot of a DOM element and trigger download
 */
export async function takeScreenshot(filename: string) {
    const root = document.getElementById("app-root");
    if (!root) return;

    try {
        const canvas = await html2canvas(root, {
            backgroundColor: "transparent",
            scale: 2, // Retina quality
            logging: false,
            useCORS: true,
        });

        const link = document.createElement("a");
        link.download = filename;
        link.href = canvas.toDataURL("image/png");
        link.click();
    } catch (err) {
        console.error("Screenshot failed:", err);
    }
}

/**
 * Wait for a given duration in ms
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Automates the process of taking screenshots for various app views
 */
export async function runStudioDirector() {
    const { setActiveView, setActiveDocument, setLanguage } = useAppStore.getState();
    const { documents } = useProjectStore.getState();

    // Force English for screenshots
    setLanguage("en");

    useToastStore.getState().push("Studio Director Started (EN Mode)", "info");

    // Scene 1: Dashboard
    setActiveView("dashboard");
    await wait(1500);
    await takeScreenshot("1_Dashboard_EN.png");

    // Scene 2: Editor (Coding View)
    setActiveView("coding");
    if (documents.length > 0) {
        setActiveDocument(documents[0].id);
    }
    await wait(1500);
    await takeScreenshot("2_Editor_EN.png");

    // Scene 3: Split-View Compare
    useAppStore.setState({ splitView: true });
    await wait(1500);
    await takeScreenshot("3_SplitView_EN.png");
    useAppStore.setState({ splitView: false });

    // Scene 4: Analysis (Smart Map)
    setActiveView("analysis");
    await wait(3000); // Allow physics to settle
    await takeScreenshot("4_SmartMap_EN.png");

    // Scene 5: Memos
    setActiveView("memos");
    await wait(1500);
    await takeScreenshot("5_Memos_EN.png");

    useToastStore.getState().push("Studio Recording Complete!", "success");
}
