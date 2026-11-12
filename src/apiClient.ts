// Thin wrapper around the backend's token-authenticated /api/mcp endpoints.
// Every request carries the per-project token so the server can attribute the
// action to the right user in its audit log.

import { config } from './config.js';

type HttpMethod = 'GET' | 'POST' | 'PUT';

interface RequestOptions {
  method?: HttpMethod;
  body?: Record<string, unknown>;
}

/** An Error that carries the HTTP status the backend answered with, when there was one. */
export interface ApiError extends Error {
  status?: number;
}

/** The JSON the backend answers with. Rendered as-is, so its shape is not narrowed here. */
export type ApiResponse = unknown;

/** A role `add_member` may grant. `admin` is deliberately not one: see tools.ts. */
export type MemberRole = 'editor' | 'viewer';

/** A knowledge file: text for .md / .txt, base64 bytes for .pdf. */
export interface UploadFileInput {
  filename: string;
  content?: string | undefined;
  contentBase64?: string | undefined;
}

async function request(
  path: string,
  { method = 'GET', body }: RequestOptions = {}
): Promise<ApiResponse> {
  let res: Response;
  try {
    res = await fetch(`${config.apiBaseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    const reason = networkErr instanceof Error ? networkErr.message : String(networkErr);
    const err = new Error(`Unable to reach the API at ${config.apiBaseUrl}: ${reason}`);
    err.cause = networkErr;
    throw err;
  }

  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = errorMessageOf(data) || `Request failed (${res.status})`;
    const err: ApiError = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

// The backend reports a failure as `{ error: string }`. Read that one field, and only when it
// is a non-empty string, so an unexpected body falls back to the status line rather than
// rendering `[object Object]`.
function errorMessageOf(data: unknown): string | undefined {
  if (typeof data === 'object' && data !== null && 'error' in data) {
    const { error } = data as { error: unknown };
    if (typeof error === 'string' && error) return error;
  }
  return undefined;
}

/** One method per backend endpoint. Every method resolves to the backend's JSON body. */
export interface ApiClient {
  me(): Promise<ApiResponse>;
  getProject(): Promise<ApiResponse>;
  search(query: string, limit?: number): Promise<ApiResponse>;
  addKnowledge(content: string): Promise<ApiResponse>;
  changeProjectTitle(title: string): Promise<ApiResponse>;
  changeProjectDescription(description: string): Promise<ApiResponse>;
  addMember(identifier: string, role?: MemberRole): Promise<ApiResponse>;
  uploadFile(input: UploadFileInput): Promise<ApiResponse>;
}

export const apiClient: ApiClient = {
  me: () => request('/mcp/me'),
  getProject: () => request('/mcp/project'),
  search: (query, limit) => request('/mcp/search', { method: 'POST', body: { query, limit } }),
  addKnowledge: (content) => request('/mcp/knowledge', { method: 'POST', body: { content } }),

  // Project management. The backend derives the acting user + project from the
  // token and enforces the scope server-side.
  //
  // There is deliberately no `createProject`. POST /api/mcp/projects is refused
  // outright — a project token is minted for one project, and creating one is not
  // work scoped to that project. Projects are created in the web app.
  changeProjectTitle: (title) =>
    request('/mcp/project/title', { method: 'PUT', body: { title } }),
  changeProjectDescription: (description) =>
    request('/mcp/project/description', { method: 'PUT', body: { description } }),
  addMember: (identifier, role) =>
    request('/mcp/project/members', { method: 'POST', body: { identifier, role } }),

  // Upload a knowledge file. Text files (.md/.txt) go as `content`; binary
  // files (.pdf) as base64 in `contentBase64`. Write access enforced server-side.
  uploadFile: ({ filename, content, contentBase64 }) =>
    request('/mcp/files', { method: 'POST', body: { filename, content, contentBase64 } }),
};
