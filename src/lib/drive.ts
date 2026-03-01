// ─── Google Drive REST API (v3) ───────────────────────────────────────────────
// Uses the OAuth access token obtained during Google Sign-In.
// Scope required: https://www.googleapis.com/auth/drive.file

const API_BASE  = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

const ROOT_FOLDER_NAME = "QualityOpen";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

interface DriveListResponse {
  files: DriveFile[];
}

// ─── Low-level fetch helper ───────────────────────────────────────────────────

async function driveRequest<T = unknown>(
  url: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new DriveError(res.status, `Drive API error ${res.status}: ${body}`);
  }

  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export class DriveError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "DriveError";
  }
}

// ─── Folder operations ────────────────────────────────────────────────────────

/**
 * Find a folder by name under 'My Drive'. Returns null if not found.
 */
export async function findFolder(
  token: string,
  name: string,
  parentId?: string
): Promise<string | null> {
  const parentQuery = parentId
    ? ` and '${parentId}' in parents`
    : " and 'root' in parents";

  const q = encodeURIComponent(
    `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQuery}`
  );

  const data = await driveRequest<DriveListResponse>(
    `${API_BASE}/files?q=${q}&fields=files(id,name)&spaces=drive`,
    token
  );

  return data.files?.[0]?.id ?? null;
}

/**
 * Create a folder and return its ID.
 */
export async function createFolder(
  token: string,
  name: string,
  parentId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) metadata.parents = [parentId];

  const data = await driveRequest<DriveFile>(
    `${API_BASE}/files?fields=id`,
    token,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(metadata),
    }
  );

  return data.id;
}

/**
 * Ensure the root QualityOpen_Data folder exists, return its ID.
 * Cached in module scope to avoid repeated API calls.
 */
let _rootFolderId: string | null = null;

export async function ensureRootFolder(token: string): Promise<string> {
  if (_rootFolderId) return _rootFolderId;
  let id = await findFolder(token, ROOT_FOLDER_NAME);
  if (!id) id = await createFolder(token, ROOT_FOLDER_NAME);
  _rootFolderId = id;
  return id;
}

export function resetFolderCache(): void {
  _rootFolderId = null;
}

// ─── File upload ──────────────────────────────────────────────────────────────

/**
 * Upload or overwrite a JSON file in the given folder.
 * Uses multipart upload for metadata + content in one request.
 */
export async function uploadJson(
  token: string,
  folderId: string,
  fileName: string,
  data: unknown
): Promise<string> {
  const json     = JSON.stringify(data, null, 2);
  const boundary = "qo_boundary_" + Date.now();

  // Check if file already exists so we can do an update instead
  const existingId = await findFileInFolder(token, folderId, fileName);

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify({ name: fileName, parents: existingId ? undefined : [folderId] }) +
    `\r\n--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    json +
    `\r\n--${boundary}--`;

  let url: string;
  let method: string;

  if (existingId) {
    // PATCH to update existing file (no parents in metadata)
    url    = `${UPLOAD_BASE}/files/${existingId}?uploadType=multipart&fields=id`;
    method = "PATCH";
  } else {
    url    = `${UPLOAD_BASE}/files?uploadType=multipart&fields=id`;
    method = "POST";
  }

  const result = await driveRequest<DriveFile>(url, token, {
    method,
    headers: { "Content-Type": `multipart/related; boundary="${boundary}"` },
    body,
  });

  return result.id;
}

async function findFileInFolder(
  token: string,
  folderId: string,
  name: string
): Promise<string | null> {
  const q = encodeURIComponent(
    `name='${name}' and '${folderId}' in parents and trashed=false`
  );
  const data = await driveRequest<DriveListResponse>(
    `${API_BASE}/files?q=${q}&fields=files(id,name)&spaces=drive`,
    token
  );
  return data.files?.[0]?.id ?? null;
}

// ─── File download ────────────────────────────────────────────────────────────

/**
 * Download a Drive file by ID and return its text content.
 */
export async function downloadFile(token: string, fileId: string): Promise<string> {
  const res = await fetch(`${API_BASE}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new DriveError(res.status, `Download failed: ${res.status}`);
  return res.text();
}

/**
 * List all JSON backup files inside the QualityOpen folder.
 * Returns files sorted newest-first by modifiedTime.
 */
export async function listBackupFiles(token: string): Promise<{ id: string; name: string; modifiedTime: string }[]> {
  const folderId = await ensureRootFolder(token);
  const q = encodeURIComponent(
    `'${folderId}' in parents and mimeType='application/json' and trashed=false`
  );
  const data = await driveRequest<{ files: { id: string; name: string; modifiedTime: string }[] }>(
    `${API_BASE}/files?q=${q}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime+desc&spaces=drive`,
    token
  );
  return data.files ?? [];
}

// ─── High-level backup ────────────────────────────────────────────────────────

export interface BackupPayload {
  version:     string;
  exportedAt:  string;
  projects:    unknown[];
  documents:   unknown[];
  codes:       unknown[];
  segments:    unknown[];
  memos:       unknown[];
}

/**
 * Returns the scheduled backup filename: QualityOpen_Data(MM.DD.YYYY).json
 */
export function scheduledBackupName(): string {
  const now = new Date();
  const mm  = String(now.getMonth() + 1).padStart(2, "0");
  const dd  = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `QualityOpen_Data(${mm}.${dd}.${yyyy}).json`;
}

/**
 * Main continuous-sync backup: overwrites `latest_backup.json`.
 */
export async function pushLatestBackup(
  token: string,
  payload: BackupPayload
): Promise<void> {
  const folderId = await ensureRootFolder(token);
  await uploadJson(token, folderId, "latest_backup.json", payload);
}

/**
 * Scheduled snapshot backup: creates/overwrites a dated file.
 */
export async function pushScheduledBackup(
  token: string,
  payload: BackupPayload
): Promise<void> {
  const folderId = await ensureRootFolder(token);
  const name     = scheduledBackupName();
  await uploadJson(token, folderId, name, payload);
}
