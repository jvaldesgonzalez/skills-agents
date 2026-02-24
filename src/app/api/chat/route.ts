import { createUIMessageStreamResponse, type UIMessage } from 'ai';
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain';
import { v4 as uuidv4 } from 'uuid';
import { createSkillsAgent } from '@/lib/agent';

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages, agentId, threadId }: { messages: UIMessage[]; agentId: string; threadId?: string } =
    await req.json();

  if (!agentId) {
    return new Response(JSON.stringify({ error: 'agentId is required' }), {
      status: 400,
    });
  }

  const agent = await createSkillsAgent(agentId);
  const langchainMessages = await toBaseMessages(messages);
  const config = {
    configurable: { thread_id: threadId ?? uuidv4() },
  };

  const stream = await agent.stream(
    { messages: langchainMessages },
    { ...config, streamMode: ['values','messages'] as const }
  );

  return createUIMessageStreamResponse({
    stream: toUIMessageStream(stream, {
      onError: (error) => {
        console.error('Error from toUIMessageStream:', error);
      }
    }),
  });
}
