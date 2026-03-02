// ─── Google Drive REST API (v3) ───────────────────────────────────────────────
// Uses the OAuth access token obtained during Google Sign-In.
// Scope required: https://www.googleapis.com/auth/drive.file
//
// All HTTP goes through Rust native_http to bypass WKWebView fetch restrictions.

import { nativeHttp } from "@/lib/nativeHttp";

const API_BASE = "https://www.googleapis.com/drive/v3";
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

// ─── Low-level request helper (via Rust reqwest) ────────────────────────────

async function driveRequest<T = unknown>(
  url: string,
  token: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {}
): Promise<T> {
  const method = (options.method ?? "GET") as "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...(options.headers ?? {}),
  };

  const res = await nativeHttp(url, { method, headers, body: options.body });

  if (res.status < 200 || res.status >= 300) {
    throw new DriveError(res.status, `Drive API error ${res.status}: ${res.body}`);
  }

  return res.body ? (JSON.parse(res.body) as T) : ({} as T);
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

export async function uploadJson(
  token: string,
  folderId: string,
  fileName: string,
  data: unknown
): Promise<string> {
  const json = JSON.stringify(data, null, 2);
  const boundary = "qo_boundary_" + Date.now();

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
    url = `${UPLOAD_BASE}/files/${existingId}?uploadType=multipart&fields=id`;
    method = "PATCH";
  } else {
    url = `${UPLOAD_BASE}/files?uploadType=multipart&fields=id`;
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

export async function downloadFile(token: string, fileId: string): Promise<string> {
  const res = await nativeHttp(`${API_BASE}/files/${fileId}?alt=media`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status < 200 || res.status >= 300) {
    throw new DriveError(res.status, `Download failed: ${res.status}`);
  }
  return res.body;
}

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
  version: string;
  exportedAt: string;
  projects: unknown[];
  documents: unknown[];
  codes: unknown[];
  segments: unknown[];
  memos: unknown[];
}

export function scheduledBackupName(): string {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const yyyy = now.getFullYear();
  return `QualityOpen_Data(${mm}.${dd}.${yyyy}).json`;
}

export async function pushLatestBackup(
  token: string,
  payload: BackupPayload
): Promise<void> {
  const folderId = await ensureRootFolder(token);
  await uploadJson(token, folderId, "latest_backup.json", payload);
}

export async function pushScheduledBackup(
  token: string,
  payload: BackupPayload
): Promise<void> {
  const folderId = await ensureRootFolder(token);
  const name = scheduledBackupName();
  await uploadJson(token, folderId, name, payload);
}
