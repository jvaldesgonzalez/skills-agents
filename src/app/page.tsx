'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAppStore, Agent } from '@/store';
import { Plus, Trash2, Bot, MessageSquare, Shield, X, Send, User, Settings2, Search, FileUp, Mic } from 'lucide-react';

function getMessageText(msg: { parts: Array<{ type?: string; text?: string }> }): string {
  return msg.parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && typeof p.text === 'string')
    .map((p) => p.text)
    .join('');
}

export default function AgentsPage() {
  const { agents, superpowers, documents, addAgent, updateAgent, deleteAgent, fetchInitialData, fetchDocuments, clearDocuments, uploadDocument, deleteDocument } = useAppStore();
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showChat, setShowChat] = useState(false);
  
  // Search state for superpowers
  const [spSearchQuery, setSpSearchQuery] = useState('');
  const [spSearchFocused, setSpSearchFocused] = useState(false);
  
  const [chatInput, setChatInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'text' | 'voice'>('text');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: { agentId: selectedAgentId, threadId: selectedAgentId ?? 'default', mode: chatMode },
      }),
    [selectedAgentId, chatMode]
  );

  const {
    messages: chatMessages,
    sendMessage,
    status,
  } = useChat({
    transport,
    id: selectedAgentId ?? 'no-agent',
  });

  const [formData, setFormData] = useState<Omit<Agent, 'id'>>({
    name: '',
    basePrompt: '',
    superpowerIds: [],
  });

  const selectedAgent = agents.find(a => a.id === selectedAgentId) || null;
  const isTyping = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (selectedAgentId && !isCreating) {
      fetchDocuments(selectedAgentId);
    } else {
      clearDocuments();
    }
  }, [selectedAgentId, isCreating, fetchDocuments, clearDocuments]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isTyping, showChat]);

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgentId(agent.id);
    setIsCreating(false);
    setShowChat(false);
    setSpSearchQuery('');
    setFormData({
      name: agent.name,
      basePrompt: agent.basePrompt,
      superpowerIds: [...agent.superpowerIds],
    });
  };

  const handleCreateNew = () => {
    setSelectedAgentId(null);
    setIsCreating(true);
    setShowChat(false);
    setSpSearchQuery('');
    setFormData({
      name: '',
      basePrompt: '',
      superpowerIds: [],
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      await addAgent(formData);
      setIsCreating(false);
    } else if (selectedAgentId) {
      await updateAgent(selectedAgentId, formData);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedAgentId || isCreating) return;
    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    const result = await uploadDocument(selectedAgentId, formData);
    if (!result.success) {
      setUploadError(result.error ?? 'Upload failed');
    }
    e.target.value = '';
  };

  const handleSuperpowerToggle = (spId: string) => {
    setFormData(prev => {
      if (prev.superpowerIds.includes(spId)) {
        return { ...prev, superpowerIds: prev.superpowerIds.filter(id => id !== spId) };
      }
      return { ...prev, superpowerIds: [...prev.superpowerIds, spId] };
    });
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedAgentId) return;
    sendMessage({ text: chatInput });
    setChatInput('');
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Agents List Sidebar */}
      <div className="w-80 flex flex-col border-r border-slate-100 bg-slate-50/30">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Agents</h1>
          <button 
            onClick={handleCreateNew}
            className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
            title="New Agent"
          >
            <Plus size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {agents.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">No agents yet.</div>
          ) : (
            agents.map(agent => (
              <div 
                key={agent.id} 
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group ${
                  selectedAgentId === agent.id 
                    ? 'bg-white shadow-md ring-1 ring-slate-200' 
                    : 'hover:bg-white hover:shadow-sm'
                }`}
                onClick={() => handleSelectAgent(agent)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${selectedAgentId === agent.id ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Bot size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{agent.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">{agent.superpowerIds.length} powers</div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteAgent(agent.id); if (selectedAgentId === agent.id) setSelectedAgentId(null); }}
                  className="p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-white">
          <Link 
            href="/superpowers"
            target="_blank"
            className="w-full py-2.5 px-4 bg-slate-900 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-sm"
          >
            <Shield size={16} /> Superpowers Registry
          </Link>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-slate-50/30">
        {(selectedAgentId || isCreating) ? (
          <div className="flex flex-col h-full">
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Settings2 size={20} />
                </div>
                <h2 className="font-bold text-slate-900 truncate max-w-md">
                  {isCreating ? 'Creating New Agent' : `Configuring ${selectedAgent?.name}`}
                </h2>
              </div>
              
              {!isCreating && (
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    showChat 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-500 hover:text-indigo-600'
                  }`}
                >
                  {showChat ? <X size={18} /> : <MessageSquare size={18} />}
                  {showChat ? 'Close Chat' : 'Test Chat'}
                </button>
              )}
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Form Section */}
              <form onSubmit={handleSubmit} className={`flex-1 overflow-y-auto p-12 space-y-8 transition-all duration-300 ${showChat ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
                <div className="max-w-3xl mx-auto space-y-8 pb-12">
                  <section className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Identity</label>
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 text-lg font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                      placeholder="Agent Name"
                    />
                  </section>

                  <section className="space-y-4">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Base Prompt</label>
                    <textarea 
                      required
                      rows={16}
                      value={formData.basePrompt}
                      onChange={e => setFormData({ ...formData, basePrompt: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-mono text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm resize-y min-h-[300px]"
                      placeholder="You are a helpful assistant..."
                    />
                  </section>

                  <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Superpowers</label>
                      <Link 
                        href="/superpowers"
                        target="_blank"
                        className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold uppercase tracking-widest hover:bg-slate-200 transition-all"
                      >
                        Manage Registry
                      </Link>
                    </div>

                    {/* Search Bar First */}
                    <div className="space-y-3 relative">
                      <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          value={spSearchQuery}
                          onChange={e => setSpSearchQuery(e.target.value)}
                          onFocus={() => setSpSearchFocused(true)}
                          onBlur={() => setTimeout(() => setSpSearchFocused(false), 200)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                          placeholder="Search to add powers..."
                        />
                      </div>
                      
                      {spSearchFocused && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-60 overflow-y-auto">
                          {superpowers
                            .filter(sp => !formData.superpowerIds.includes(sp.id) && 
                                          (sp.name.toLowerCase().includes(spSearchQuery.toLowerCase()) || 
                                           sp.description.toLowerCase().includes(spSearchQuery.toLowerCase())))
                            .slice(0, spSearchQuery.trim() === '' ? 5 : undefined)
                            .map(sp => (
                              <button
                                key={sp.id}
                                type="button"
                                onClick={() => {
                                  handleSuperpowerToggle(sp.id);
                                  setSpSearchQuery('');
                                }}
                                className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-all border-b border-slate-50 last:border-0 group"
                              >
                                <div className="flex items-center gap-3 text-left">
                                  <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                    <Shield size={16} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900">{sp.name}</div>
                                    <div className="text-xs text-slate-500 line-clamp-1">{sp.description}</div>
                                  </div>
                                </div>
                                <Plus size={16} className="text-slate-300 group-hover:text-indigo-600" />
                              </button>
                            ))
                          }
                          {superpowers.filter(sp => !formData.superpowerIds.includes(sp.id) && 
                                                  (sp.name.toLowerCase().includes(spSearchQuery.toLowerCase()) || 
                                                   sp.description.toLowerCase().includes(spSearchQuery.toLowerCase()))).length === 0 && (
                            <div className="p-8 text-center text-slate-400 text-sm italic">
                              No unattached powers found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Attached List Second */}
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Attached</label>
                      {formData.superpowerIds.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm">
                          No powers attached yet.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-2">
                          {formData.superpowerIds.map(id => {
                            const sp = superpowers.find(s => s.id === id);
                            if (!sp) return null;
                            return (
                              <div 
                                key={sp.id} 
                                className="p-3 bg-white rounded-xl border border-indigo-100 flex items-center justify-between shadow-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                    <Shield size={14} />
                                  </div>
                                  <div>
                                    <div className="text-sm font-bold text-slate-900">{sp.name}</div>
                                    <div className="text-[10px] text-slate-500 line-clamp-1">{sp.description}</div>
                                  </div>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => handleSuperpowerToggle(sp.id)}
                                  className="p-2 text-slate-300 hover:text-red-600 transition-all"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>

                  {!isCreating && selectedAgentId && (
                    <section className="space-y-4">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Knowledge Base</label>
                      <p className="text-sm text-slate-500">Upload CSV files. The agent can search them during chat.</p>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 hover:border-indigo-200 hover:text-indigo-600 transition-all text-sm font-medium"
                      >
                        <FileUp size={18} /> Upload CSV
                      </button>
                      {uploadError && (
                        <p className="text-sm text-red-600">{uploadError}</p>
                      )}
                      {documents.length === 0 ? (
                        <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm">
                          No documents yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {documents.map((doc) => (
                            <div
                              key={doc.id}
                              className="p-3 bg-white rounded-xl border border-slate-100 flex items-center justify-between shadow-sm"
                            >
                              <span className="text-sm font-medium text-slate-900 truncate">{doc.name}</span>
                              <button
                                type="button"
                                onClick={() => deleteDocument(doc.id)}
                                className="p-2 text-slate-300 hover:text-red-600 transition-all shrink-0"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  )}

                  <div className="pt-8 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                      type="button" 
                      onClick={() => { setSelectedAgentId(null); setIsCreating(false); }}
                      className="px-8 py-3 text-slate-500 font-bold text-sm hover:text-slate-900 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
                    >
                      {isCreating ? 'Create Agent' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Chat Overlay/Sidebar */}
              {showChat && !isCreating && (
                <div className="w-[480px] border-l border-slate-100 bg-white flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 shrink-0">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/30 shrink-0 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 text-white rounded-xl">
                          <Bot size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">{selectedAgent?.name}</h3>
                          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Live Preview</p>
                        </div>
                      </div>
                      <button onClick={() => setShowChat(false)} className="p-2 text-slate-400 hover:bg-slate-200/50 rounded-xl">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="flex gap-1 p-1 bg-white rounded-lg border border-slate-200 w-fit">
                      <button
                        type="button"
                        onClick={() => setChatMode('text')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          chatMode === 'text' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <MessageSquare size={14} /> Text
                      </button>
                      <button
                        type="button"
                        onClick={() => setChatMode('voice')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                          chatMode === 'voice' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        <Mic size={14} /> Voice
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 space-y-4" ref={scrollRef}>
                    {chatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-50">
                        <Bot size={48} />
                        <p className="text-sm font-medium">Chat is empty</p>
                      </div>
                    ) : (
                      chatMessages.map(msg => (
                        <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            msg.role === 'assistant' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                          </div>
                          <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                            msg.role === 'user' 
                              ? 'bg-slate-900 text-white rounded-tr-none' 
                              : 'bg-slate-50 text-slate-700 border border-slate-100 rounded-tl-none'
                          }`}>
                            {getMessageText(msg)}
                          </div>
                        </div>
                      ))
                    )}
                    {isTyping && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                          <Bot size={16} />
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl rounded-tl-none border border-slate-100 flex gap-1">
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 bg-white border-t border-slate-100 shrink-0">
                    <form 
                      className="flex gap-2"
                      onSubmit={handleChatSubmit}
                    >
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        placeholder={`Message ${selectedAgent?.name}...`}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        disabled={isTyping}
                      />
                      <button 
                        type="submit" 
                        disabled={!chatInput.trim() || isTyping}
                        className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100"
                      >
                        <Send size={18} />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
              <Bot size={48} className="text-indigo-600" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Agent Studio</h2>
              <p className="text-sm mt-2 text-slate-500">Select an agent or create a new one to begin.</p>
            </div>
            <button 
              onClick={handleCreateNew}
              className="mt-4 px-8 py-3 bg-white border border-slate-200 rounded-2xl text-slate-900 font-bold text-sm shadow-sm hover:shadow-md hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"
            >
              <Plus size={18} /> New Agent
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
