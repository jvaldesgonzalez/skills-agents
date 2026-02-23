import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const queryDbTool = tool(
  async () => {
    console.log(`[AGENT] 🛠️ CALLING TOOL: query_db`);
    return 'Database queries are disabled. This tool is not available.';
  },
  {
    name: 'query_db',
    description: 'Execute a database query. (Disabled - this tool is not available.)',
    schema: z.object({}).describe('No parameters - tool is disabled'),
  }
);
