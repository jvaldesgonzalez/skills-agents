import { tool } from '@langchain/core/tools';
import { Document } from '@langchain/core/documents';
import { z } from 'zod';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import * as actions from '@/lib/actions';

const NO_DOCS_MESSAGE = `No documents in the knowledge base. Upload CSV files to the agent's knowledge base to enable semantic search.`;

function csvContentToDocuments(
  docs: Array<{ id: string; name: string; content: string }>
): Document[] {
  const documents: Document[] = [];
  for (const doc of docs) {
    const rows = doc.content.trim().split(/\r?\n/).filter(Boolean);
    for (let i = 0; i < rows.length; i++) {
      documents.push(
        new Document({
          pageContent: rows[i],
          metadata: { source: doc.name, rowIndex: i + 1 },
        })
      );
    }
  }
  return documents;
}

export async function createQueryFilesTool(agentId: string) {
  const docs = await actions.getDocumentsWithContent(agentId);
  const documents = csvContentToDocuments(docs);

  if (documents.length === 0) {
    return tool(
      async () => NO_DOCS_MESSAGE,
      {
        name: 'query_files',
        description:
          'Search documents in the agent knowledge base using semantic similarity. Returns relevant rows from uploaded CSV files. You MUST specify which files to search.',
        schema: z.object({
          query: z.string().describe('The search query to find relevant document content'),
          fileNames: z.array(z.string()).describe('The names of the files to search in (from the knowledge base)'),
        }),
      }
    );
  }

  const embeddings = new GoogleGenerativeAIEmbeddings({
    model: 'models/gemini-embedding-001',
  });
  const vectorStore = await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
  );

  return tool(
    async ({ query, fileNames }) => {
      console.log(`[AGENT] 🛠️ CALLING TOOL: query_files | query: "${query}" | files:`, fileNames);
      
      const filter = fileNames && fileNames.length > 0
        ? (doc: Document) => fileNames.includes(doc.metadata.source)
        : undefined;

      const results = await vectorStore.similaritySearch(query, 8, filter);
      if (results.length === 0) {
        const fileList = fileNames && fileNames.length > 0 ? ` in ${fileNames.join(', ')}` : '';
        return `No relevant content found${fileList}. Try a broader or different query.`;
      }
      const formatted = results
        .map(
          (d, i) =>
            `[${i + 1}] (${d.metadata.source}): ${d.pageContent}`
        )
        .join('\n\n');
      return formatted;
    },
    {
      name: 'query_files',
      description:
        'Search documents in the agent knowledge base using semantic similarity. Returns relevant rows from uploaded CSV files. You MUST specify which files to search.',
      schema: z.object({
        query: z.string().describe('The search query to find relevant document content'),
        fileNames: z.array(z.string()).describe('The names of the files to search in (from the knowledge base)'),
      }),
    }
  );
}
