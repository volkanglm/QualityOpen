import type { Project, Document, Code, Segment, Memo, Synthesis } from "@/types";

const PROJECT_ID = "mock-project-hybrid-2024";

export const MOCK_PROJECT: Project = {
    id: PROJECT_ID,
    name: "Hybrid Work and Employee Well-being Study",
    description: "A comprehensive study on the impact of hybrid work models on burnout and productivity in the post-pandemic era.",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    color: "#6366f1",
};

export const MOCK_CODES: Code[] = [
    { id: "c1", projectId: PROJECT_ID, name: "Burnout Symptoms", color: "#ef4444", createdAt: Date.now() },
    { id: "c1-1", projectId: PROJECT_ID, name: "Emotional Exhaustion", parentId: "c1", color: "#f87171", createdAt: Date.now() },
    { id: "c1-2", projectId: PROJECT_ID, name: "Reduced Personal Accomplishment", parentId: "c1", color: "#fca5a1", createdAt: Date.now() },
    { id: "c2", projectId: PROJECT_ID, name: "Hybrid Model Dynamics", color: "#a855f7", createdAt: Date.now() },
    { id: "c2-1", projectId: PROJECT_ID, name: "Flexibility Benefits", parentId: "c2", color: "#c084fc", createdAt: Date.now() },
    { id: "c2-2", projectId: PROJECT_ID, name: "Social Isolation", parentId: "c2", color: "#d8b4fe", createdAt: Date.now() },
    { id: "c3", projectId: PROJECT_ID, name: "Organizational Support", color: "#22c55e", createdAt: Date.now() },
    { id: "c4", projectId: PROJECT_ID, name: "Work-Life Balance", color: "#3b82f6", createdAt: Date.now() },
    { id: "c5", projectId: PROJECT_ID, name: "Technostress", color: "#f59e0b", createdAt: Date.now() },
];

const DOC_NAMES = [
    "Interview: Sarah J. (Software Engineer)",
    "Interview: Mark R. (Project Manager)",
    "Focus Group: Marketing Team",
    "Field Note: Coworking Space Observation",
    "Interview: Emily S. (HR Director)",
    "Interview: David K. (Sales Representative)",
    "Report: 2023 Hybrid Satisfaction Survey",
    "Interview: Chloe T. (Freelance Designer)",
    "Interview: Brian O. (Operations Specialist)",
    "Analysis Note: Burnout Scale Interpretations"
];

export const MOCK_DOCUMENTS: Document[] = DOC_NAMES.map((name, i) => ({
    id: `d${i + 1}`,
    projectId: PROJECT_ID,
    name,
    content: i % 2 === 0
        ? `Interviewer: What does the hybrid work model mean to you?\n\nParticipant: For me, it means flexibility, but sometimes it's really hard to set boundaries. I find myself still at my computer at 9 PM. When I was in the office, at least when I walked out the door, the work was finished. Now my bedroom has turned into my office. I feel emotionally exhausted sometimes. It saddens me that corporate support is limited only to technical tools.\n\nInterviewer: How does it affect your work-life balance?\n\nParticipant: I can say there's no balance left. A notification is constantly coming, Zoom meetings one after another. Technostress has peaked. There are moments when I miss going to the office because the sense of isolation is very heavy.`
        : `Research Note: While the vast majority of participants emphasize the flexibility advantage brought by working from home, they state that social capital has decreased. Office days are used more for 'socialization' and 'coordination', while home days are reserved for 'deep work'. However, the expectation of being constantly accessible has created a chronic fatigue in employees. Especially the feeling of low success and the weakening of corporate belonging are among the noteworthy findings.`,
    type: i < 6 ? "interview" : i < 9 ? "document" : "fieldnote",
    tags: i % 2 === 0 ? ["positive", "critical"] : ["general"],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    wordCount: 150,
}));

export const MOCK_SEGMENTS: Segment[] = [];
MOCK_DOCUMENTS.forEach((doc, di) => {
    MOCK_SEGMENTS.push({
        id: `seg-${di}-1`,
        documentId: doc.id,
        projectId: PROJECT_ID,
        start: 50,
        end: 150,
        text: "For me, it means flexibility, but sometimes it's really hard to set boundaries.",
        codeIds: ["c2-1", "c4"],
        createdAt: Date.now()
    });
    MOCK_SEGMENTS.push({
        id: `seg-${di}-2`,
        documentId: doc.id,
        projectId: PROJECT_ID,
        start: 240,
        end: 380,
        text: "I find myself still at my computer at 9 PM. When I was in the office, at least when I walked out the door, the work was finished.",
        codeIds: ["c1", "c4"],
        createdAt: Date.now()
    });
    MOCK_SEGMENTS.push({
        id: `seg-${di}-3`,
        documentId: doc.id,
        projectId: PROJECT_ID,
        start: 450,
        end: 580,
        text: "I feel emotionally exhausted sometimes. It saddens me that corporate support is limited only to technical tools.",
        codeIds: ["c1-1", "c3"],
        createdAt: Date.now()
    });
});

export const MOCK_MEMOS: Memo[] = [
    {
        id: "m1",
        projectId: PROJECT_ID,
        title: "Initial Impression on Technostress",
        content: "Participants frequently mention the 'infinite scroll' of work notifications. The lack of a physical commute seems to remove a vital decompression phase, leading directly to higher stress levels.",
        createdAt: Date.now(),
        updatedAt: Date.now()
    },
    {
        id: "m2",
        projectId: PROJECT_ID,
        title: "Isolation vs. Productivity",
        content: "An interesting paradox is emerging: home work increases individual output but decreases team cohesion. Need to cross-reference with 'Social Isolation' codes.",
        createdAt: Date.now(),
        updatedAt: Date.now()
    }
];

export const MOCK_SYNTHESES: Synthesis[] = [
    {
        id: "s1",
        projectId: PROJECT_ID,
        codeId: "c1",
        content: "Higher burnout levels are strongly correlated with participants reporting a lack of clear boundaries between home and work life.",
        updatedAt: Date.now()
    }
];
