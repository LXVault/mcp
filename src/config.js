// Centralised configuration for the MCP server, read from the environment.
// The API token is per-project: it scopes the server to a single project and
// lets the backend trace every action back to the user who generated it.

const rawBase = process.env.MCP_API_BASE_URL || 'http://localhost:4000/api';

export const config = {
  // Base URL of the Express backend API, without a trailing slash.
  apiBaseUrl: rawBase.replace(/\/+$/, ''),
  // Per-project token generated from the web app's "Access Tokens" page.
  apiToken: process.env.MCP_API_TOKEN || '',
};

export function assertConfigured() {
  if (!config.apiToken) {
    throw new Error(
      'MCP_API_TOKEN is not set. Generate a token from the web app (Access Tokens page) ' +
        'and expose it to this server as the MCP_API_TOKEN environment variable.'
    );
  }
}
