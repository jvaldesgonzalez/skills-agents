import { tool } from '@langchain/core/tools';
import vm from 'node:vm';
import { z } from 'zod';

const TIMEOUT_MS = 50000;

export function createRunScriptTool(scripts: Record<string, string>) {
  return tool(
    async ({ scriptName, paramsJson }) => {
      console.log(`[AGENT] 🛠️ CALLING TOOL: run_script | script: "${scriptName}" | params:`, paramsJson);
      
      const code = scripts[scriptName];
      if (!code) {
        const available = Object.keys(scripts).join(', ');
        return `Script '${scriptName}' not found. Available scripts: ${available || 'none'}`;
      }

      try {
        const params = paramsJson ? JSON.parse(paramsJson) : {};
        const paramsStr = JSON.stringify(params);
        const wrappedCode = `
          ${code}
          if (typeof main !== 'function') {
            throw new Error('Script must define a main(params) function');
          }
          const params = JSON.parse(${JSON.stringify(paramsStr)});
          main(params);
        `;
        
        const context = vm.createContext({ 
          console, 
          fetch, 
          setTimeout, 
          clearTimeout, 
          URL, 
          URLSearchParams 
        });
        const script = new vm.Script(wrappedCode);
        
        const syncResult = script.runInContext(context, { timeout: TIMEOUT_MS });
        
        // If the result is a Promise, we also need to enforce a timeout on its resolution
        let result = syncResult;
        if (syncResult && typeof syncResult.then === 'function') {
          result = await Promise.race([
            syncResult,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Script async execution timed out')), TIMEOUT_MS)
            )
          ]);
        }
        
        return JSON.stringify(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return `Error running script: ${msg}`;
      }
    },
    {
      name: 'run_script',
      description: `Execute a script by name. Scripts are defined in the loaded skills. Pass the script name (e.g. from the skill's ## Scripts section) and optional params. Use when you need to run a predefined script from a skill.`,
      schema: z.object({
        scriptName: z.string().describe('Name of the script to run (as defined in a loaded skill)'),
        paramsJson: z.string().optional().describe('Optional JSON string of parameters to pass to main(params)'),
      }),
    }
  );
}
