import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

// -- CONFIGURACOES VIEW --
export const ConfiguracoesView = ({ company, profile }) => {
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);

  // Field Form Modal
  const [editingField, setEditingField] = useState(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    const fetchConfig = async () => {
      setLoading(true);
      const { data } = await supabase.from('lead_field_config').select('*').order('column_order', { ascending: true });
      setConfig(data || []);
      setLoading(false);
    };
    fetchConfig();
  }, [company]);

  const handleDelete = async (id, label) => {
    if (!window.confirm(`Tem certeza que deseja deletar o campo "${label}"?`)) return;
    const { error } = await supabase.from('lead_field_config').delete().eq('id', id);
    if (!error) setConfig(prev => prev.filter(c => c.id !== id));
    else alert('Erro ao deletar campo.');
  };

  const handleSaveField = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Format options before save if it's dropdown
    let formattedOptions = null;
    let syncTasks = [];

    if (editingField.field_type === 'dropdown') {
      formattedOptions = (editingField.options || []).map(o => ({ label: o.label, color: o.color }));
      
      // Check for renames
      if (!isNew) {
        const renamedOptions = (editingField.options || []).filter(o => o.originalLabel && o.originalLabel !== o.label);
        syncTasks = renamedOptions;
      }
    }
    
    let saveError = null;
    let savedData = null;

    if (isNew) {
      const { error, data } = await supabase.from('lead_field_config').insert([{ 
        ...editingField, 
        options: formattedOptions,
        company_id: company.id 
      }]).select().single();
      saveError = error;
      savedData = data;
    } else {
      // Execute sync tasks for renamed labels in Leads
      for (const opt of syncTasks) {
        const { data: leadsToUpdate } = await supabase.from('leads').select('id, metadata').eq('company_id', company.id);
        if (leadsToUpdate) {
          const matches = leadsToUpdate.filter(l => l.metadata && l.metadata[editingField.field_key] === opt.originalLabel);
          for (const match of matches) {
             await supabase.from('leads').update({
               metadata: { ...match.metadata, [editingField.field_key]: opt.label }
             }).eq('id', match.id);
          }
        }
      }

      const { error, data } = await supabase.from('lead_field_config').update({
        field_label: editingField.field_label,
        field_type: editingField.field_type,
        column_order: editingField.column_order,
        is_required: editingField.is_required,
        options: formattedOptions,
        number_format: editingField.field_type === 'number' ? (editingField.number_format || 'number') : null
      }).eq('id', editingField.id).select().single();
      
      saveError = error;
      savedData = data;
    }

    if (!saveError && savedData) {
      setEditingField(null);

      // 1. Re-fetch all rows for this company ordered by column_order ASC
      const { data: currentRows } = await supabase
        .from('lead_field_config')
        .select('*')
        .eq('company_id', company.id)
        .order('column_order', { ascending: true });

      if (currentRows) {
        // Tie-breaker: if a duplicate column_order exists, prioritize the newly saved/edited row
        currentRows.sort((a, b) => {
          if (a.column_order === b.column_order) {
            return a.id === savedData.id ? -1 : (b.id === savedData.id ? 1 : 0);
          }
          return 0; // Already sorted by supabase
        });

        // 2 & 3. Reassign sequentially and run individual updates for changed rows
        for (let i = 0; i < currentRows.length; i++) {
          const expectedOrder = i + 1;
          if (currentRows[i].column_order !== expectedOrder) {
            await supabase
              .from('lead_field_config')
              .update({ column_order: expectedOrder })
              .eq('id', currentRows[i].id);
          }
        }
        
        // 4. Final re-fetch to refresh the UI
        const { data: finalRows } = await supabase
          .from('lead_field_config')
          .select('*')
          .eq('company_id', company.id)
          .order('column_order', { ascending: true });
          
        setConfig(finalRows || []);
      }
    } else {
      alert(isNew ? 'Erro ao criar campo.' : 'Erro ao atualizar campo.');
    }
    setSaving(false);
  };

  const handleAddOption = () => {
    setEditingField(prev => ({
      ...prev,
      options: [...(prev.options || []), { _uid: Math.random().toString(), label: 'Nova Opção', color: '#3b82f6', originalLabel: '' }]
    }));
  };

  const handleUpdateOption = (uid, key, value) => {
    setEditingField(prev => ({
      ...prev,
      options: prev.options.map(o => o._uid === uid ? { ...o, [key]: value } : o)
    }));
  };

  const handleRemoveOption = (uid) => {
    setEditingField(prev => ({
      ...prev,
      options: prev.options.filter(o => o._uid !== uid)
    }));
  };

  const toSnakeCase = str => str.toLowerCase().replace(/[\s\W]+/g, '_').replace(/^_|_$/g, '');

  return (
    <div className="space-y-8 overflow-y-auto h-full pr-4 pb-4 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700">
      {/* Sec 1: Company Info */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4 tracking-tight">Informações da Empresa</h3>
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-6">
          <div className="flex-1 space-y-4">
            <div>
              <span className="block text-sm text-gray-500 dark:text-zinc-400">Razão Social / Nome</span>
              <span className="block text-base font-medium text-gray-900 dark:text-zinc-100">{company?.nome_empresa || '-'}</span>
            </div>
            <div>
              <span className="block text-sm text-gray-500 dark:text-zinc-400">Nome Fantasia</span>
              <span className="block text-base font-medium text-gray-900 dark:text-zinc-100">{company?.name || '-'}</span>
            </div>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <span className="block text-sm text-gray-500 dark:text-zinc-400 mb-1">Status do Fluxo</span>
              {company?.fluxo_ativo ? 
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">Ativo</span> : 
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 ring-1 ring-inset ring-gray-500/10 dark:ring-zinc-600/30">Inativo</span>}
            </div>
            <div className="flex gap-8">
              <div>
                <span className="block text-sm text-gray-500 dark:text-zinc-400">Máx. Usuários</span>
                <span className="block text-base font-medium text-gray-900 dark:text-zinc-100">{company?.max_users || 0}</span>
              </div>
              <div>
                <span className="block text-sm text-gray-500 dark:text-zinc-400">Máx. Contatos</span>
                <span className="block text-base font-medium text-gray-900 dark:text-zinc-100">{company?.max_contacts || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sec 2: Lead Field Config */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">Campos Personalizados (Leads)</h3>
          <button onClick={() => { setIsNew(true); setEditingField({ field_label: '', field_key: '', field_type: 'text', column_order: config.length + 1, is_required: false, options: [], number_format: 'number' }); }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
            + Novo Campo
          </button>
        </div>
        
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 text-xs uppercase font-semibold text-gray-500 dark:text-zinc-500 tracking-wider">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Label</th>
                <th className="px-6 py-4 whitespace-nowrap">Chave (Key)</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Tipo</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Obrigatório</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Ordem</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 animate-pulse">Carregando configurações...</td></tr>
              ) : config.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum campo personalizado cadastrado.</td></tr>
              ) : (
                config.sort((a,b) => a.column_order - b.column_order).map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-zinc-100">{c.field_label}</td>
                    <td className="px-6 py-4"><span className="font-mono text-xs bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded text-gray-600 dark:text-zinc-300">{c.field_key}</span></td>
                    <td className="px-6 py-4 text-center">{c.field_type}</td>
                    <td className="px-6 py-4 text-center">
                      {c.is_required ? <span className="text-blue-600 dark:text-blue-400 font-medium text-xs">Sim</span> : <span className="text-gray-400 text-xs">Não</span>}
                    </td>
                    <td className="px-6 py-4 text-center">{c.column_order}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button onClick={() => { setIsNew(false); setEditingField({...c, options: (c.options||[]).map(o => ({...o, _uid: Math.random().toString(), originalLabel: o.label}))}); }} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"><EditIcon /></button>
                        <button onClick={() => handleDelete(c.id, c.field_label)} className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Field Editor Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setEditingField(null)}></div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-md flex flex-col relative animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">{isNew ? 'Novo Campo' : 'Editar Campo'}</h3>
              <button onClick={() => setEditingField(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">✕</button>
            </div>
            
            <form id="edit-field-form" onSubmit={handleSaveField} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Label</label>
                <input required type="text" value={editingField.field_label || ''} onChange={e => setEditingField(prev => ({...prev, field_label: e.target.value, ...(isNew && !prev.field_key_edited ? {field_key: toSnakeCase(e.target.value)} : {})}))} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Chave (Key)</label>
                <input required type="text" value={editingField.field_key || ''} onChange={e => setEditingField({...editingField, field_key: e.target.value, field_key_edited: true})} disabled={!isNew} className="w-full font-mono text-sm px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed" />
                {!isNew && <p className="text-xs text-gray-500 mt-1">A chave não pode ser alterada após a criação.</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Tipo</label>
                  <select required value={editingField.field_type || 'text'} onChange={e => setEditingField({...editingField, field_type: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="text">Texto</option>
                    <option value="number">Número</option>
                    <option value="boolean">Verdadeiro/Falso</option>
                    <option value="date">Data</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Ordem</label>
                  <input required type="number" min="1" value={editingField.column_order || 1} onChange={e => setEditingField({...editingField, column_order: parseInt(e.target.value) || 0})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>

              {editingField.field_type === 'number' && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Formato</label>
                  <select value={editingField.number_format || 'number'} onChange={e => setEditingField({...editingField, number_format: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50">
                    <option value="number">Número</option>
                    <option value="percent">Porcentagem</option>
                    <option value="currency_brl">R$ (BRL)</option>
                    <option value="currency_usd">$ (USD)</option>
                  </select>
                </div>
              )}

              {editingField.field_type === 'dropdown' && (
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300">Opções do Dropdown</label>
                    <button type="button" onClick={handleAddOption} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">+ Adicionar Opção</button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {(editingField.options || []).map((opt) => (
                      <div key={opt._uid} className="flex gap-2 items-center bg-gray-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-gray-100 dark:border-zinc-700/50">
                        <div className="relative">
                          {/* We use input type color with custom styling to mask it beautifully */}
                          <input type="color" value={opt.color} onChange={e => handleUpdateOption(opt._uid, 'color', e.target.value)} className="w-8 h-8 p-0 border-0 rounded-md cursor-pointer absolute opacity-0 inset-0" />
                          <div className="w-8 h-8 rounded-md shadow-sm border border-gray-200 dark:border-zinc-600" style={{ backgroundColor: opt.color }}></div>
                        </div>
                        <input required type="text" value={opt.label} onChange={e => handleUpdateOption(opt._uid, 'label', e.target.value)} placeholder="Nome da opção" className="flex-1 px-3 py-1.5 rounded-md bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 text-sm text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:border-blue-500 shadow-sm" />
                        <button type="button" onClick={() => handleRemoveOption(opt._uid)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"><TrashIcon /></button>
                      </div>
                    ))}
                    {(!editingField.options || editingField.options.length === 0) && (
                      <div className="text-xs text-gray-500 dark:text-zinc-500 italic text-center py-4">Nenhuma opção adicionada. Adicione para criar o dropdown.</div>
                    )}
                  </div>
                  {!isNew && <p className="text-xs text-orange-600 dark:text-orange-400/80 mt-2 font-medium">Nota: Renomear uma opção atualizará automaticamente o valor nos leads existentes.</p>}
                </div>
              )}

              <label className="flex items-center gap-2 cursor-pointer group pt-2">
                <div className="relative">
                  <input type="checkbox" className="sr-only" checked={editingField.is_required || false} onChange={e => setEditingField({...editingField, is_required: e.target.checked})} />
                  <div className={`w-10 h-6 bg-gray-200 dark:bg-zinc-700 rounded-full transition-colors ${editingField.is_required ? 'bg-blue-500 dark:bg-blue-600' : ''}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editingField.is_required ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100">Campo Obrigatório</span>
              </label>
            </form>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingField(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button type="submit" form="edit-field-form" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm disabled:opacity-70 transition-colors">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
