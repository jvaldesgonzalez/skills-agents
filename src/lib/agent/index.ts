import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import * as actions from '@/lib/actions';
import { createSkillMiddleware } from './middleware';
import {
  createRunScriptTool,
  createQueryFilesTool,
  queryDbTool,
  httpCallTool,
} from './tools';

import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

const STATIC_TOOL_NAMES = ['query_db', 'http_call'] as const;
type StaticToolName = (typeof STATIC_TOOL_NAMES)[number];

const STATIC_TOOLS = {
  query_db: queryDbTool,
  http_call: httpCallTool,
} as const;

export async function createSkillsAgent(
  agentId: string,
  options?: { mode?: 'text' | 'voice' }
) {
  const mode = options?.mode ?? 'text';
  const agents = await actions.getAgents();
  const resolvedAgent = agents.find((a) => a.id === agentId);
  if (!resolvedAgent) {
    throw new Error(`Agent not found: ${agentId}`);
  }

  const allSuperpowers = await actions.getSuperpowers();
  const agentSuperpowers = allSuperpowers.filter((s) =>
    resolvedAgent.superpowerIds.includes(s.id)
  );

  const scriptsDict: Record<string, string> = {};
  for (const sp of agentSuperpowers) {
    for (const script of sp.scripts ?? []) {
      if (script.name && script.content) {
        scriptsDict[script.name] = script.content;
      }
    }
  }

  const toolNames = new Set<string>();
  for (const sp of agentSuperpowers) {
    for (const t of sp.tools) {
      const name = typeof t === 'string' ? t.split(/[("]/)[0] : String(t);
      if (name) toolNames.add(name);
    }
  }

  const agentTools = [] as Array<
    | (typeof STATIC_TOOLS)[StaticToolName]
    | ReturnType<typeof createRunScriptTool>
    | Awaited<ReturnType<typeof createQueryFilesTool>>
  >;
  for (const n of toolNames) {
    if (n === 'run_script') {
      agentTools.push(createRunScriptTool(scriptsDict));
    } else if (n === 'query_files') {
      agentTools.push(await createQueryFilesTool(resolvedAgent.id));
    } else if (n in STATIC_TOOLS) {
      agentTools.push(STATIC_TOOLS[n as StaticToolName]);
    }
  }

  const skillMiddleware = createSkillMiddleware(agentSuperpowers);

  const checkpointer = new MemorySaver();

  const documents = await actions.getDocuments(agentId);
  const kbFilesPrompt =
    documents.length > 0
      ? `\n\n## Knowledge Base\n\nYou have access to the following files in your knowledge base: ${documents.map((d) => d.name).join(', ')}.`
      : '';

  const textModePrompt =
    mode === 'text'
      ? '\n\nNEVER MENTION USING TOOLS, MISTAKES, OR THAT YOU WILL CHECK SOMETHING—JUST DO IT. DO NOT PROVIDE COMMENTARY BEFORE USING A TOOL; CALL IT IMMEDIATELY WHEN NEEDED. NEVER MENTION A SKILL OR A SEARCH IN SOME DOCUMENT, NEITHER A SCRIPT EXECUTION OR SKILL LOADING.'
      : '';

  const agentSystemPrompt = resolvedAgent.basePrompt + kbFilesPrompt + textModePrompt;

  return createAgent({
    model: new ChatGoogleGenerativeAI({
      model: 'gemini-2.5-flash',
    }),
    systemPrompt: agentSystemPrompt,
    tools: [...agentTools],
    middleware: [skillMiddleware],
    checkpointer,
  });
}
