import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const httpCallTool = tool(
  async ({ url, method, headersJson, body }) => {
    console.log(`[AGENT] 🛠️ CALLING TOOL: http_call | method: ${method || 'GET'} | url: ${url}`);
    
    try {
      const headers: Record<string, string> = headersJson
        ? JSON.parse(headersJson)
        : {};
      const res = await fetch(url, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: body || undefined,
      });
      const text = await res.text();
      return JSON.stringify({
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: text,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `HTTP request failed: ${msg}`;
    }
  },
  {
    name: 'http_call',
    description: 'Make an HTTP request (GET, POST, PUT, PATCH, DELETE) to a URL. Returns status, headers, and body. Supports curl-like requests for external APIs.',
    schema: z.object({
      url: z.url().describe('The URL to request'),
      method: z
        .enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
        .optional()
        .describe('HTTP method (default: GET)'),
      headersJson: z
        .string()
        .optional()
        .describe('Optional JSON object of HTTP headers'),
      body: z.string().optional().describe('Optional request body (for POST, PUT, PATCH)'),
    }),
  }
);
