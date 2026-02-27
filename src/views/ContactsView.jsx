import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateAndLocale } from '../utils/formatters';

const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

// -- CONTATOS VIEW --
export const ContatosView = ({ company }) => {
  const [contatos, setContatos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [localFilter, setLocalFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    if (!company) return;
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase.from('contacts').select('*').order('data_da_coleta', { ascending: false });
      setContatos(data || []);
      setLoading(false);
    };
    fetchData();
  }, [company]);

  const locaisUnicos = useMemo(() => {
    const locs = new Set(contatos.map(c => c.local).filter(Boolean));
    return Array.from(locs).sort();
  }, [contatos]);

  const filteredContatos = useMemo(() => {
    return contatos.filter(contato => {
      // Search
      const searchMatch = !search || 
        (contato.name && contato.name.toLowerCase().includes(search.toLowerCase())) || 
        (contato.telefone && contato.telefone.toLowerCase().includes(search.toLowerCase()));
      if (!searchMatch) return false;

      // Local
      if (localFilter !== 'all' && contato.local !== localFilter) return false;

      // Date
      if (dateFrom && new Date(contato.data_da_coleta) < new Date(dateFrom)) return false;
      if (dateTo && new Date(contato.data_da_coleta) > new Date(dateTo + 'T23:59:59')) return false;

      return true;
    });
  }, [contatos, search, localFilter, dateFrom, dateTo]);

  const todayStr = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => {
    const total = contatos.length;
    const disparosHoje = contatos.filter(c => c.ultimo_disparo?.startsWith(todayStr)).length;
    const somaDisparos = contatos.reduce((acc, c) => acc + (c.quantidade_de_disparos || 0), 0);
    const media = total > 0 ? (somaDisparos / total).toFixed(1) : '0.0';
    return { total, disparosHoje, media };
  }, [contatos, todayStr]);

  const paginatedContatos = filteredContatos.slice((page - 1) * itemsPerPage, page * itemsPerPage);
  const totalPages = Math.ceil(filteredContatos.length / itemsPerPage) || 1;

  const truncate = (str, n) => (str?.length > n) ? str.slice(0, n - 1) + '...' : str;

  return (
    <div className="flex flex-col h-full space-y-6 pb-2">
      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {[
          { label: 'Total de Contatos', value: stats.total },
          { label: 'Disparos Hoje', value: stats.disparosHoje },
          { label: 'Média de Disparos por Contato', value: stats.media }
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
          <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Local</label>
          <select value={localFilter} onChange={e => setLocalFilter(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500">
            <option value="all">Todos</option>
            {locaisUnicos.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Coleta (De)</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">Coleta (Até)</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-2 bg-gray-50 dark:bg-zinc-800 border-none rounded-lg text-sm text-gray-900 dark:text-zinc-100 focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <button onClick={() => { setSearch(''); setLocalFilter('all'); setDateFrom(''); setDateTo(''); }} className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">Limpar</button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="overflow-x-auto overflow-y-auto flex-1 relative scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700">
          <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-900 text-xs uppercase font-semibold text-gray-500 dark:text-zinc-500 tracking-wider sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap min-w-[200px] border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Contato</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Local</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Data Coleta</th>
                <th className="px-6 py-4 whitespace-nowrap border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Últ. Disparo</th>
                <th className="px-6 py-4 whitespace-nowrap text-center border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Qtd. Disparos</th>
                <th className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900">Última Resposta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400 animate-pulse">Carregando contatos...</td></tr>
              ) : paginatedContatos.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Nenhum contato encontrado.</td></tr>
              ) : (
                paginatedContatos.map(contato => (
                  <tr key={contato.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 dark:text-zinc-100">{contato.name || '-'}</div>
                      <div className="text-xs text-gray-500">{contato.telefone || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{contato.local || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDateAndLocale(contato.data_da_coleta)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDateAndLocale(contato.ultimo_disparo)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center font-medium bg-gray-50/50 dark:bg-zinc-900/30">{contato.quantidade_de_disparos || 0}</td>
                    <td className="px-6 py-4">
                      {contato.ultima_resposta ? (
                        <div title={contato.ultima_resposta} className="max-w-xs cursor-help border-b border-dashed border-gray-300 dark:border-zinc-600 inline-block">
                          {truncate(contato.ultima_resposta, 60)}
                        </div>
                      ) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex items-center justify-between shrink-0">
          <span className="text-xs text-gray-500 dark:text-zinc-400">Mostrando {paginatedContatos.length} de {filteredContatos.length}</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Anterior</button>
            <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors">Próximo</button>
          </div>
        </div>
      </div>
    </div>
  );
};
