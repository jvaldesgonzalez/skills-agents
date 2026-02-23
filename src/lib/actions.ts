'use server';

import { prisma } from '@/lib/prisma';
import type { Agent, Superpower, SuperpowerScript } from '@/store';

function parseTools(tools: string): string[] {
  try {
    const parsed = JSON.parse(tools);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseScripts(scripts: string): SuperpowerScript[] {
  try {
    const parsed = JSON.parse(scripts);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is SuperpowerScript =>
        s && typeof s.name === 'string' && typeof s.content === 'string'
    );
  } catch {
    return [];
  }
}

function dbSuperpowerToStore(row: {
  id: string;
  name: string;
  description: string;
  content: string;
  tools: string;
  scripts: string;
}): Superpower {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    content: row.content,
    tools: parseTools(row.tools),
    scripts: parseScripts(row.scripts),
  };
}

export async function getSuperpowers(): Promise<Superpower[]> {
  const rows = await prisma.superpower.findMany({ orderBy: { name: 'asc' } });
  return rows.map(dbSuperpowerToStore);
}

export async function addSuperpower(
  superpower: Omit<Superpower, 'id'>
): Promise<Superpower> {
  const created = await prisma.superpower.create({
    data: {
      name: superpower.name,
      description: superpower.description ?? '',
      content: superpower.content ?? '',
      tools: JSON.stringify(superpower.tools ?? []),
      scripts: JSON.stringify(superpower.scripts ?? []),
    },
  });
  return dbSuperpowerToStore(created);
}

export async function updateSuperpower(
  id: string,
  superpower: Omit<Superpower, 'id'>
): Promise<Superpower | null> {
  const updated = await prisma.superpower.update({
    where: { id },
    data: {
      name: superpower.name,
      description: superpower.description ?? '',
      content: superpower.content ?? '',
      tools: JSON.stringify(superpower.tools ?? []),
      scripts: JSON.stringify(superpower.scripts ?? []),
    },
  }).catch(() => null);
  return updated ? dbSuperpowerToStore(updated) : null;
}

export async function deleteSuperpower(id: string): Promise<boolean> {
  const result = await prisma.superpower.delete({ where: { id } }).catch(() => null);
  return result != null;
}

export async function getAgents(): Promise<Agent[]> {
  const rows = await prisma.agent.findMany({
    orderBy: { name: 'asc' },
    include: { superpowers: { select: { superpowerId: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    basePrompt: row.basePrompt ?? '',
    superpowerIds: row.superpowers.map((s) => s.superpowerId),
  }));
}

export async function addAgent(agent: Omit<Agent, 'id'>): Promise<Agent> {
  const created = await prisma.agent.create({
    data: {
      name: agent.name,
      basePrompt: agent.basePrompt ?? '',
      superpowers: {
        create: (agent.superpowerIds ?? []).map((superpowerId) => ({
          superpowerId,
        })),
      },
    },
    include: { superpowers: { select: { superpowerId: true } } },
  });
  return {
    id: created.id,
    name: created.name,
    basePrompt: created.basePrompt ?? '',
    superpowerIds: created.superpowers.map((s) => s.superpowerId),
  };
}

export async function updateAgent(
  id: string,
  agent: Omit<Agent, 'id'>
): Promise<Agent | null> {
  await prisma.$transaction(async (tx) => {
    await tx.agent.update({
      where: { id },
      data: {
        name: agent.name,
        basePrompt: agent.basePrompt ?? '',
      },
    });
    await tx.superpowerOnAgents.deleteMany({ where: { agentId: id } });
    const superpowerIds = agent.superpowerIds ?? [];
    if (superpowerIds.length > 0) {
      await tx.superpowerOnAgents.createMany({
        data: superpowerIds.map((superpowerId) => ({ agentId: id, superpowerId })),
      });
    }
  });
  const updated = await prisma.agent.findUnique({
    where: { id },
    include: { superpowers: { select: { superpowerId: true } } },
  });
  if (!updated) return null;
  return {
    id: updated.id,
    name: updated.name,
    basePrompt: updated.basePrompt ?? '',
    superpowerIds: updated.superpowers.map((s) => s.superpowerId),
  };
}

export async function deleteAgent(id: string): Promise<boolean> {
  const result = await prisma.agent.delete({ where: { id } }).catch(() => null);
  return result != null;
}

export type DocumentRecord = { id: string; name: string; createdAt: Date };

export async function getDocuments(agentId: string): Promise<DocumentRecord[]> {
  const rows = await prisma.document.findMany({
    where: { agentId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, createdAt: true },
  });
  return rows;
}

export async function uploadDocument(
  agentId: string,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const file = formData.get('file') as File | null;
  if (!file) {
    return { success: false, error: 'No file provided' };
  }
  const name = file.name.toLowerCase();
  if (!name.endsWith('.csv')) {
    return { success: false, error: 'Only CSV files are allowed' };
  }
  let content: string;
  try {
    content = await file.text();
  } catch {
    return { success: false, error: 'Failed to read file' };
  }
  try {
    await prisma.document.create({
      data: { agentId, name: file.name, content },
    });
    return { success: true };
  } catch {
    return { success: false, error: 'Failed to save document' };
  }
}

export async function deleteDocument(id: string): Promise<boolean> {
  const result = await prisma.document.delete({ where: { id } }).catch(() => null);
  return result != null;
}

export async function getDocumentsWithContent(
  agentId: string
): Promise<Array<{ id: string; name: string; content: string }>> {
  const rows = await prisma.document.findMany({
    where: { agentId },
    select: { id: true, name: true, content: true },
  });
  return rows;
}
