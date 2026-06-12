// Thin wrapper around the backend's token-authenticated /api/mcp endpoints.
// Every request carries the per-project token so the server can attribute the
// action to the right user in its audit log.

import { config } from './config.js';

async function request(path, { method = 'GET', body } = {}) {
  let res;
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
    const err = new Error(`Unable to reach the API at ${config.apiBaseUrl}: ${networkErr.message}`);
    err.cause = networkErr;
    throw err;
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const apiClient = {
  me: () => request('/mcp/me'),
  getProject: () => request('/mcp/project'),
  search: (query, limit) => request('/mcp/search', { method: 'POST', body: { query, limit } }),
  addKnowledge: (content) => request('/mcp/knowledge', { method: 'POST', body: { content } }),

  // Project management. The backend derives the acting user + project from the
  // token and enforces owner/admin server-side.
  createProject: (title, summary) =>
    request('/mcp/projects', { method: 'POST', body: { title, summary } }),
  changeProjectTitle: (title) =>
    request('/mcp/project/title', { method: 'PUT', body: { title } }),
  changeProjectDescription: (description) =>
    request('/mcp/project/description', { method: 'PUT', body: { description } }),
  addMember: (identifier, role) =>
    request('/mcp/project/members', { method: 'POST', body: { identifier, role } }),
};
