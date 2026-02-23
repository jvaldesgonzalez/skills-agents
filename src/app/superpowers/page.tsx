'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAppStore, Superpower, SuperpowerScript } from '@/store';
import { Plus, Trash2, Edit2, X, Shield, ChevronLeft } from 'lucide-react';
import CodeEditor from '@uiw/react-textarea-code-editor';

const PREDEFINED_TOOLS = [
  'run_script',
  'query_files',
  'query_db',
  'http_call',
];

const DEFAULT_SCRIPT_CODE = `// Code should consist of a main function that receives params.
// Example: function main(params) { return result; }

function main(params) {
  // your logic here
  return params;
}
`;

export default function SuperpowersPage() {
  const { superpowers, addSuperpower, updateSuperpower, deleteSuperpower, fetchInitialData } = useAppStore();
  const [selectedSuperpowerId, setSelectedSuperpowerId] = useState<string | null>(null);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);
  
  const selectedSuperpower = superpowers.find(s => s.id === selectedSuperpowerId) || null;
  const isCreating = selectedSuperpowerId === 'new';

  const [formData, setFormData] = useState<Omit<Superpower, 'id'>>({
    name: '',
    description: '',
    content: '',
    tools: [],
    scripts: [],
  });

  const [showScriptModal, setShowScriptModal] = useState(false);
  const [editingScriptIndex, setEditingScriptIndex] = useState<number | 'new' | null>(null);
  const [scriptFormData, setScriptFormData] = useState<SuperpowerScript>({ name: '', content: '' });

  const handleSelectSuperpower = (superpower: Superpower) => {
    setSelectedSuperpowerId(superpower.id);
    setFormData({
      name: superpower.name,
      description: superpower.description,
      content: superpower.content,
      tools: [...superpower.tools],
      scripts: superpower.scripts ? [...superpower.scripts] : [],
    });
  };

  const handleCreateNew = () => {
    setSelectedSuperpowerId('new');
    setFormData({
      name: '',
      description: '',
      content: '',
      tools: [],
      scripts: [],
    });
  };

  const handleOpenAddScript = () => {
    setEditingScriptIndex('new');
    setScriptFormData({ name: '', content: DEFAULT_SCRIPT_CODE });
    setShowScriptModal(true);
  };

  const handleOpenEditScript = (index: number) => {
    const script = formData.scripts?.[index];
    if (!script) return;
    setEditingScriptIndex(index);
    setScriptFormData({ ...script });
    setShowScriptModal(true);
  };

  const handleSaveScript = () => {
    if (!scriptFormData.name.trim()) return;
    
    setFormData(prev => {
      const scripts = [...(prev.scripts ?? [])];
      if (editingScriptIndex === 'new') {
        scripts.push({ ...scriptFormData });
      } else if (typeof editingScriptIndex === 'number') {
        scripts[editingScriptIndex] = { ...scriptFormData };
      }
      return { ...prev, scripts };
    });
    setShowScriptModal(false);
    setEditingScriptIndex(null);
  };

  const handleRemoveScript = (index: number) => {
    setFormData(prev => ({
      ...prev,
      scripts: (prev.scripts ?? []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      await addSuperpower(formData);
    } else if (selectedSuperpowerId) {
      await updateSuperpower(selectedSuperpowerId, formData);
    }
    setSelectedSuperpowerId(null);
  };

  const handleToolToggle = (tool: string) => {
    setFormData(prev => {
      if (prev.tools.includes(tool)) {
        return { ...prev, tools: prev.tools.filter(t => t !== tool) };
      }
      return { ...prev, tools: [...prev.tools, tool] };
    });
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Superpowers List Sidebar */}
      <div className="w-80 flex flex-col border-r border-slate-100 bg-slate-50/30">
        <div className="p-6 border-b border-slate-100 flex flex-col gap-4 bg-white">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-indigo-600 transition-all text-xs font-bold uppercase tracking-widest">
            <ChevronLeft size={14} /> Back to Studio
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Powers</h1>
            <button 
              onClick={handleCreateNew}
              className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm"
            >
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {superpowers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm italic">No powers yet.</div>
          ) : (
            superpowers.map(sp => (
              <div 
                key={sp.id} 
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all group ${
                  selectedSuperpowerId === sp.id 
                    ? 'bg-white shadow-md ring-1 ring-slate-200' 
                    : 'hover:bg-white hover:shadow-sm'
                }`}
                onClick={() => handleSelectSuperpower(sp)}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-lg ${selectedSuperpowerId === sp.id ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
                    <Shield size={18} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{sp.name}</div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSuperpower(sp.id); if (selectedSuperpowerId === sp.id) setSelectedSuperpowerId(null); }}
                  className="p-1.5 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative bg-slate-50/30">
        {(selectedSuperpowerId || isCreating) ? (
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <div className="h-16 border-b border-slate-100 bg-white flex items-center px-8 shrink-0">
              <h2 className="font-bold text-slate-900">
                {isCreating ? 'Creating New Power' : `Editing ${selectedSuperpower?.name}`}
              </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-12">
              <div className="max-w-4xl mx-auto space-y-10 pb-12">
                <section className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">General Information</label>
                  <div className="space-y-4">
                    <input 
                      required
                      type="text" 
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                      placeholder="Power Name"
                    />
                    <input 
                      required
                      type="text" 
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm"
                      placeholder="Brief Description"
                    />
                  </div>
                </section>

                <section className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Core Instructions</label>
                  <textarea 
                    required
                    rows={12}
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-2xl px-6 py-4 text-slate-900 font-mono text-sm leading-relaxed focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-300 shadow-sm resize-none"
                    placeholder="System instructions for this power..."
                  />
                </section>

                <section className="space-y-4">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tools & Integrations</label>
                  <div className="grid grid-cols-2 gap-3">
                    {PREDEFINED_TOOLS.map(tool => (
                      <label 
                        key={tool} 
                        className={`p-4 rounded-2xl cursor-pointer border-2 transition-all flex items-start gap-4 ${
                          formData.tools.includes(tool)
                            ? 'border-indigo-600 bg-indigo-50/50 ring-4 ring-indigo-500/5'
                            : 'border-white bg-white hover:border-slate-200 shadow-sm'
                        }`}
                      >
                        <input 
                          type="checkbox" 
                          checked={formData.tools.includes(tool)}
                          onChange={() => handleToolToggle(tool)}
                          className="mt-1 w-5 h-5 rounded-lg text-indigo-600 bg-slate-100 border-transparent focus:ring-offset-0 transition-all"
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-slate-900 font-mono">{tool}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Executable Scripts</label>
                    <button 
                      type="button"
                      onClick={handleOpenAddScript}
                      className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all"
                    >
                      Add Script
                    </button>
                  </div>
                  
                  {formData.scripts?.length === 0 ? (
                    <div className="p-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-sm">
                      No custom scripts attached.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {formData.scripts?.map((script, index) => (
                        <div key={index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm group relative">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-mono text-xs font-bold">JS</div>
                            <div className="text-sm font-bold text-slate-900 truncate">{script.name}</div>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              type="button"
                              onClick={() => handleOpenEditScript(index)}
                              className="flex-1 py-2 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all"
                            >
                              Edit Code
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleRemoveScript(index)}
                              className="p-2 text-slate-300 hover:text-red-600 transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="pt-8 border-t border-slate-100 flex justify-end gap-3">
                  <button 
                    type="button" 
                    onClick={() => setSelectedSuperpowerId(null)}
                    className="px-8 py-3 text-slate-500 font-bold text-sm hover:text-slate-900 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all active:translate-y-0"
                  >
                    {isCreating ? 'Create Power' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6">
            <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500">
              <Shield size={48} className="text-slate-900" />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900">Powers Library</h2>
              <p className="text-sm mt-2 text-slate-500">Select or create a superpower to configure its capabilities.</p>
            </div>
          </div>
        )}

        {/* Script Modal */}
        {showScriptModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-white shrink-0">
                <h3 className="text-2xl font-bold text-slate-900">
                  {editingScriptIndex === 'new' ? 'New Script' : 'Edit Script'}
                </h3>
                <button 
                  onClick={() => setShowScriptModal(false)}
                  className="p-3 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-10 space-y-8">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">Function Name</label>
                  <input 
                    type="text" 
                    value={scriptFormData.name}
                    onChange={e => setScriptFormData({ ...scriptFormData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-slate-900 font-bold focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                    placeholder="e.g. calculate_metrics"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 block">JS Implementation</label>
                  <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden ring-1 ring-slate-100/50">
                    <CodeEditor
                      value={scriptFormData.content}
                      language="js"
                      onChange={(e) => setScriptFormData({ ...scriptFormData, content: e.target.value })}
                      padding={32}
                      style={{ fontSize: 14, minHeight: 400, backgroundColor: '#fff', fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="px-10 py-6 border-t border-slate-50 flex gap-4 justify-end shrink-0 bg-white">
                <button 
                  type="button" 
                  onClick={() => setShowScriptModal(false)}
                  className="px-8 py-3 text-slate-500 font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleSaveScript}
                  disabled={!scriptFormData.name.trim()}
                  className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50"
                >
                  Confirm Script
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
