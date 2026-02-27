import React from 'react';

const LogoImage = ({ isDark, className }) => {
  return (
    <img 
      src={isDark ? "/logo.png" : "/black_logo.png"} 
      alt="Orbital IA" 
      className={className} 
    />
  );
};

const OverviewIcon = () => <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;

export const Sidebar = ({ darkMode, activeView, setActiveView, companyName, userName, onLogout }) => {
  const isDark = darkMode;

  return (
    <aside className="w-[220px] bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 flex flex-col transition-colors z-10 shrink-0">
      <div className="p-6">
        <h1 className="text-lg font-semibold tracking-tight truncate" title={companyName || 'Carregando...'}>
          {companyName || 'Carregando...'}
        </h1>
        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 truncate">
          {userName}
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <button 
          onClick={() => setActiveView('overview')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'overview' ? 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'}`}
        >
          <span><OverviewIcon /></span>
          <span>Visão Geral</span>
        </button>
        <button 
          onClick={() => setActiveView('leads')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'leads' ? 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'}`}
        >
          <span>◎</span>
          <span>Leads</span>
        </button>
        <button 
          onClick={() => setActiveView('contatos')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'contatos' ? 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'}`}
        >
          <span>👥</span>
          <span>Contatos</span>
        </button>
        <button 
          onClick={() => setActiveView('configuracoes')}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'configuracoes' ? 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-200'}`}
        >
          <span>⚙</span>
          <span>Configurações</span>
        </button>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-zinc-800">
        <button onClick={onLogout} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors">
          Sair
        </button>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800/50 flex flex-col items-center">
          <LogoImage isDark={isDark} className="h-4 opacity-70" />
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 tracking-wider uppercase">Orbital IA</span>
        </div>
      </div>
    </aside>
  );
};
