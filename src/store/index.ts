import { create } from 'zustand';
import * as actions from '@/lib/actions';

export interface SuperpowerScript {
  name: string;
  content: string;
}

export interface Superpower {
  id: string;
  name: string;
  description: string;
  content: string;
  tools: string[];
  scripts?: SuperpowerScript[];
}

export interface Agent {
  id: string;
  name: string;
  basePrompt: string;
  superpowerIds: string[];
}

export interface Document {
  id: string;
  name: string;
  createdAt: Date;
}

interface AppState {
  superpowers: Superpower[];
  agents: Agent[];
  documents: Document[];
  fetchInitialData: () => Promise<void>;
  fetchDocuments: (agentId: string) => Promise<void>;
  clearDocuments: () => void;
  uploadDocument: (agentId: string, formData: FormData) => Promise<{ success: boolean; error?: string }>;
  deleteDocument: (id: string) => Promise<void>;
  addSuperpower: (superpower: Omit<Superpower, 'id'>) => Promise<void>;
  updateSuperpower: (id: string, superpower: Omit<Superpower, 'id'>) => Promise<void>;
  deleteSuperpower: (id: string) => Promise<void>;
  addAgent: (agent: Omit<Agent, 'id'>) => Promise<void>;
  updateAgent: (id: string, agent: Omit<Agent, 'id'>) => Promise<void>;
  deleteAgent: (id: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  superpowers: [],
  agents: [],
  documents: [],

  fetchDocuments: async (agentId) => {
    const docs = await actions.getDocuments(agentId);
    set({ documents: docs });
  },

  clearDocuments: () => set({ documents: [] }),

  uploadDocument: async (agentId, formData) => {
    const result = await actions.uploadDocument(agentId, formData);
    if (result.success) {
      await get().fetchDocuments(agentId);
    }
    return result;
  },

  deleteDocument: async (id) => {
    const ok = await actions.deleteDocument(id);
    if (ok) {
      set((s) => ({ documents: s.documents.filter((d) => d.id !== id) }));
    }
  },

  fetchInitialData: async () => {
    const [superpowers, agents] = await Promise.all([
      actions.getSuperpowers(),
      actions.getAgents(),
    ]);
    set({ superpowers, agents });
  },

  addSuperpower: async (superpower) => {
    const created = await actions.addSuperpower(superpower);
    set((state) => ({ superpowers: [...state.superpowers, created] }));
  },

  updateSuperpower: async (id, updatedSuperpower) => {
    const result = await actions.updateSuperpower(id, updatedSuperpower);
    if (result) {
      set((state) => ({
        superpowers: state.superpowers.map((s) =>
          s.id === id ? { ...updatedSuperpower, id } : s
        ),
      }));
    }
  },

  deleteSuperpower: async (id) => {
    const ok = await actions.deleteSuperpower(id);
    if (ok) {
      set((state) => ({
        superpowers: state.superpowers.filter((s) => s.id !== id),
        agents: state.agents.map((a) => ({
          ...a,
          superpowerIds: a.superpowerIds.filter((sid) => sid !== id),
        })),
      }));
    }
  },

  addAgent: async (agent) => {
    const created = await actions.addAgent(agent);
    set((state) => ({ agents: [...state.agents, created] }));
  },

  updateAgent: async (id, updatedAgent) => {
    const result = await actions.updateAgent(id, updatedAgent);
    if (result) {
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? { ...updatedAgent, id } : a)),
      }));
    }
  },

  deleteAgent: async (id) => {
    const ok = await actions.deleteAgent(id);
    if (ok) {
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
      }));
    }
  },
}));
