// ─── Core Domain Types ────────────────────────────────────────────────────────

export type ID = string;

export interface Project {
  id: ID;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  color?: string;
}

/** How the document content is stored / should be rendered */
export type DocumentFormat = "text" | "html" | "pdf" | "video" | "image";

export interface Document {
  id: ID;
  projectId: ID;
  name: string;
  /** plain text, HTML, base64 PDF/image, or blob URL for video */
  content: string;
  format?: DocumentFormat;     // default "text"
  type: "interview" | "fieldnote" | "document" | "memo" | "video" | "image";
  tags: string[];
  createdAt: number;
  updatedAt: number;
  wordCount?: number;
  /** For video docs: duration in seconds (set after first load) */
  mediaDuration?: number;
  /** Document-level researcher note */
  note?: string;
}

export interface Code {
  id: ID;
  projectId: ID;
  name: string;
  description?: string;
  color: string;
  parentId?: ID;
  createdAt: number;
  usageCount?: number;
}

export interface Segment {
  id: ID;
  documentId: ID;
  projectId: ID;
  start: number;
  end: number;
  text: string;
  codeIds: ID[];
  memo?: string;
  createdAt: number;
  /** If true, this is a pure visual highlight (no code assigned) */
  isHighlight?: boolean;
  highlightColor?: string;
}

export interface Memo {
  id: ID;
  projectId: ID;
  title: string;
  content: string;
  linkedSegments?: ID[];
  linkedCodes?: ID[];
  createdAt: number;
  updatedAt: number;
}

// ─── UI State Types ───────────────────────────────────────────────────────────

export type ViewMode = "documents" | "coding" | "analysis" | "memos" | "settings" | "dashboard";

export type Language = "tr" | "en";

export type Theme = "dark" | "light";

/** Panel widths stored as pixel values; layout computes % from container */
export interface PanelWidths {
  left: number;   // px
  right: number;  // px
}

export interface ActiveSelection {
  text: string;
  start: number;
  end: number;
  documentId: ID;
}

export interface AppState {
  activeProjectId: ID | null;
  activeDocumentId: ID | null;
  activeView: ViewMode;
  theme: Theme;
  language: Language;
  panelWidths: PanelWidths;
  leftCollapsed: boolean;
  rightCollapsed: boolean;
  /** Most recent text selection in the document editor */
  activeSelection: ActiveSelection | null;
  /** Whether the CMD+K command palette is open */
  commandPaletteOpen: boolean;
  /** Code ID filter for segment retrieval view (null = normal document view) */
  activeCodeFilter: ID | null;
  /** Whether AI chat panel is open */
  chatOpen: boolean;
  /** Document search query */
  searchQuery: string;
}

// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

// ─── Sync Types ───────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "success" | "error";

export type BackupSchedule = "manual" | "daily" | "weekly" | "monthly";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number | null;    // unix ms
  lastBackupAt: number | null;
  backupSchedule: BackupSchedule;
  errorMessage: string | null;
  driveFolderId: string | null;
  /** True when Drive returned 401/403 — local-only mode until re-auth */
  driveDisabled: boolean;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
  /** Firebase custom claim: premium=true → full access */
  premium: boolean | null;
  /** True when the app is running from an offline cache session */
  offlineMode: boolean;
  /** True during the initial boot splash screen */
  booting: boolean;
}
