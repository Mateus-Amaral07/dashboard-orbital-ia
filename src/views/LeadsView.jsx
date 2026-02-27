import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateAndLocale, formatValue, formatNumberValue } from '../utils/formatters';

const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;

export const LeadsView = ({ company }) => {
  const [leads, setLeads] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [interestFilter, setInterestFilter] = useState('all');
  const [replyFilter, setReplyFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  // Edit Modal
  const [editingLead, setEditingLead] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!company) return;
    const fetchData = async () => {
      setLoading(true);
      const [{ data: leadsData }, { data: configData }] = await Promise.all([
        supabase.from('leads').select('*').order('created_at', { ascending: false }),
        supabase.from('lead_field_config').select('*').order('column_order', { ascending: true })
      ]);
      setLeads(leadsData || []);
      setConfig(configData || []);
      setLoading(false);
    };
    fetchData();
  }, [company]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Search
      const searchMatch = !search || 
        (lead.name && lead.name.toLowerCase().includes(search.toLowerCase())) || 
        (lead.telefone && lead.telefone.toLowerCase().includes(search.toLowerCase()));
      if (!searchMatch) return false;

      // Interest
      if (interestFilter === 'interest' && !lead.demonstrou_interesse) return false;
      if (interestFilter === 'no_interest' && lead.demonstrou_interesse) return false;

      // Reply type
      if (replyFilter === 'manual' && !lead.foi_resposta_manual) return false;
      if (replyFilter === 'auto' && lead.foi_resposta_manual) return false;

      // Date
      if (dateFrom && new Date(lead.created_at) < new Date(dateFrom)) return false;
      if (dateTo && new Date(lead.created_at) > new Date(dateTo + 'T23:59:59')) return false;

      return true;
    });
  }, [leads, search, interestFilter, replyFilter, dateFrom, dateTo]);

  const todayStr = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => ({
    total: leads.length,
    interested: leads.filter(l => l.demonstrou_interesse).length,
    manual: leads.filter(l => l.foi_resposta_manual).length,
    today: leads.filter(l => l.created_at?.startsWith(todayStr)).length
  }), [leads, todayStr]);

  const { paginatedLeads, totalPages, hasDropdowns } = useMemo(() => {
    const pLeads = filteredLeads.slice((page - 1) * itemsPerPage, page * itemsPerPage);
    const pages = Math.ceil(filteredLeads.length / itemsPerPage) || 1;
    const dropdownConfigs = config.filter(c => c.field_type === 'dropdown');

    return { paginatedLeads: pLeads, totalPages: pages, hasDropdowns: dropdownConfigs.length > 0 };
  }, [filteredLeads, page, itemsPerPage, config]);

  const handleSaveLead = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    // Construct metadata
    const newMetadata = { ...editingLead.metadata };
    
    const { error, data } = await supabase
      .from('leads')
      .update({
        name: editingLead.name,
        telefone: editingLead.telefone,
        resposta: editingLead.resposta,
        foi_resposta_manual: editingLead.foi_resposta_manual,
        ai_briefing: editingLead.ai_briefing,
        demonstrou_interesse: editingLead.demonstrou_interesse,
        metadata: editingLead.metadata
      })
      .eq('id', editingLead.id)
      .select()
      .single();

    if (!error && data) {
      setLeads(prev => prev.map(l => l.id === data.id ? data : l));
      setEditingLead(null);
    } else {
      alert('Erro ao salvar lead.');
      console.error(error);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-2">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        {[
          { label: 'Total de Leads', value: stats.total },
          { label: 'Demonstraram Interesse', value: stats.interested },
          { label: 'Respostas Manuais', value: stats.manual },
          { label: 'Leads Hoje', value: stats.today }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
            <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium mb-1">{stat.label}</span>
            <span className="text-2xl font-semibold text-gray-900 dark:text-zinc-100">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-wrap gap-4 items-end shrink-0">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Buscar</label>
          <div className="relative">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome ou telefone..." className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" />
            <div className="absolute left-3 top-2.5 text-gray-400"><SearchIcon /></div>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Interesse</label>
          <select value={interestFilter} onChange={e => setInterestFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
            <option value="all">Todos</option>
            <option value="interest">Com interesse</option>
            <option value="no_interest">Sem interesse</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Tipo Resposta</label>
          <select value={replyFilter} onChange={e => setReplyFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
            <option value="all">Todos</option>
            <option value="manual">Manual</option>
            <option value="auto">Automática</option>
          </select>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">De</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Até</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button onClick={() => { setSearch(''); setInterestFilter('all'); setReplyFilter('all'); setDateFrom(''); setDateTo(''); }} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">Limpar</button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 relative scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700">
          <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-900 text-xs uppercase font-semibold text-gray-500 dark:text-zinc-500 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Nome / Telefone</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900 text-center w-16">Ação</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Interesse</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Resp. Manual</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Data</th>
                {config.map(c => <th key={c.id} className="px-6 py-4 whitespace-nowrap min-w-[150px] max-w-[250px] truncate border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900" title={c.field_label}>{c.field_label}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={100} className="px-6 py-8 text-center text-gray-400 animate-pulse">Carregando leads...</td></tr>
              ) : paginatedLeads.length === 0 ? (
                <tr><td colSpan={100} className="px-6 py-8 text-center text-gray-400">Nenhum lead encontrado.</td></tr>
              ) : (
                paginatedLeads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-zinc-100">{lead.name || '-'}</div>
                      <div className="text-xs text-gray-500">{lead.telefone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button onClick={() => setEditingLead({ ...lead, metadata: lead.metadata || {} })} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 bg-blue-50/50 dark:bg-blue-900/10 rounded-lg transition-all" title="Editar Lead">
                        <EditIcon />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.demonstrou_interesse ? 
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-inset ring-green-600/20">Sim</span> : 
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 ring-1 ring-inset ring-gray-500/10 dark:ring-zinc-600/30">Não</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.foi_resposta_manual ? 
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 ring-1 ring-inset ring-blue-600/20">Sim</span> : 
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 ring-1 ring-inset ring-gray-500/10 dark:ring-zinc-600/30">Não</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDateAndLocale(lead.created_at)}</td>
                    {config.map(c => (
                      <td key={c.id} className="px-6 py-4 whitespace-nowrap text-gray-700 dark:text-zinc-300 min-w-[150px] max-w-[250px] truncate" title={String(lead.metadata?.[c.field_key] || '')}>
                        {formatValue(c.field_type, lead.metadata?.[c.field_key], c.options, c.number_format)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 dark:text-zinc-400">Mostrando {paginatedLeads.length} de {filteredLeads.length}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Anterior</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Próximo</button>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm" onClick={() => setEditingLead(null)}></div>
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col relative animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50/50 dark:bg-zinc-900/50">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 tracking-tight">Editar Lead</h3>
              <button onClick={() => setEditingLead(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">✕</button>
            </div>
            
            <form id="edit-lead-form" onSubmit={handleSaveLead} className="p-6 overflow-y-auto flex-1 space-y-5">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Nome</label>
                  <input type="text" value={editingLead.name || ''} onChange={e => setEditingLead({...editingLead, name: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Telefone</label>
                  <input type="text" value={editingLead.telefone || ''} onChange={e => setEditingLead({...editingLead, telefone: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Resposta</label>
                <textarea rows={3} value={editingLead.resposta || ''} onChange={e => setEditingLead({...editingLead, resposta: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">AI Briefing</label>
                <textarea rows={3} value={editingLead.ai_briefing || ''} onChange={e => setEditingLead({...editingLead, ai_briefing: e.target.value})} className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={editingLead.demonstrou_interesse || false} onChange={e => setEditingLead({...editingLead, demonstrou_interesse: e.target.checked})} />
                    <div className={`w-10 h-6 bg-gray-200 dark:bg-zinc-700 rounded-full transition-colors ${editingLead.demonstrou_interesse ? 'bg-blue-500 dark:bg-blue-600' : ''}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editingLead.demonstrou_interesse ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100">Demonstrou Interesse</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="sr-only" checked={editingLead.foi_resposta_manual || false} onChange={e => setEditingLead({...editingLead, foi_resposta_manual: e.target.checked})} />
                    <div className={`w-10 h-6 bg-gray-200 dark:bg-zinc-700 rounded-full transition-colors ${editingLead.foi_resposta_manual ? 'bg-blue-500 dark:bg-blue-600' : ''}`}></div>
                    <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${editingLead.foi_resposta_manual ? 'translate-x-4' : ''}`}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-zinc-300 group-hover:text-gray-900 dark:group-hover:text-zinc-100">Resposta Manual</span>
                </label>
              </div>

              {config.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-2 gap-5">
                  <div className="col-span-2 text-sm font-semibold text-gray-500 dark:text-zinc-500 uppercase tracking-wider">Campos Personalizados</div>
                  {config.map(c => (
                    <div key={c.id}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">{c.field_label}</label>
                      {c.field_type === 'boolean' ? (
                        <select 
                          value={editingLead.metadata[c.field_key] || ''} 
                          onChange={e => setEditingLead({...editingLead, metadata: {...editingLead.metadata, [c.field_key]: e.target.value === 'true' ? true : e.target.value === 'false' ? false : null}})}
                          className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">-</option>
                          <option value="true">Sim</option>
                          <option value="false">Não</option>
                        </select>
                      ) : c.field_type === 'dropdown' ? (
                        <select 
                          value={editingLead.metadata[c.field_key] || ''} 
                          onChange={e => setEditingLead({...editingLead, metadata: {...editingLead.metadata, [c.field_key]: e.target.value}})}
                          className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        >
                          <option value="">- Selecione -</option>
                          {(c.options || []).map(opt => (
                            <option key={opt.label} value={opt.label}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <div>
                          <input 
                            type={c.field_type === 'number' ? 'number' : c.field_type === 'date' ? 'date' : 'text'}
                            value={editingLead.metadata[c.field_key] || ''}
                            onChange={e => setEditingLead({...editingLead, metadata: {...editingLead.metadata, [c.field_key]: e.target.value}})}
                            className="w-full px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                          {c.field_type === 'number' && editingLead.metadata[c.field_key] && (
                            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">Prévia: {formatNumberValue(editingLead.metadata[c.field_key], c.number_format)}</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </form>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingLead(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors">Cancelar</button>
              <button type="submit" form="edit-lead-form" disabled={saving} className="px-5 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white shadow-sm disabled:opacity-70 transition-colors">
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
