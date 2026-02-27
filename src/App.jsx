import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { DarkModeToggle } from './components/DarkModeToggle';
import { OverviewView } from './views/OverviewView';
import { LeadsView } from './views/LeadsView';
import { ContatosView } from './views/ContactsView';
import { ConfiguracoesView } from './views/SettingsView';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  // App state
  const [profile, setProfile] = useState(null);
  const [company, setCompany] = useState(null);
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'leads', 'contatos', 'configuracoes'

  // Effect: Auth listener & initial load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Effect: Load initial data when session exists
  useEffect(() => {
    if (session) {
      const loadProfileAndCompany = async () => {
        const { data: profileData } = await supabase.from('profiles').select('nome, company_id').eq('id', session.user.id).single();
        if (profileData) {
          setProfile(profileData);
          const { data: companyData } = await supabase.from('companies').select('*').eq('id', profileData.company_id).single();
          if (companyData) setCompany(companyData);
        }
      };
      loadProfileAndCompany();
    }
  }, [session]);

  // Effect: Theme application
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  const handleLogout = () => supabase.auth.signOut();

  if (loading) return null; // or a simple spinner

  if (!session) {
    return <LoginScreen darkMode={theme === 'dark'} setDarkMode={toggleTheme} />;
  }

  const isDark = theme === 'dark';
  
  // App Layout
  return (
    <div className="flex h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 overflow-hidden transition-colors duration-200">
      
      {/* Sidebar */}
      <Sidebar 
        darkMode={isDark} 
        activeView={activeView} 
        setActiveView={setActiveView} 
        companyName={company?.name || company?.nome_empresa} 
        userName={profile?.nome || session.user.email} 
        onLogout={handleLogout} 
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm border-b border-white/50 dark:border-zinc-800/50 sticky top-0 z-10 shrink-0">
          <h2 className="text-xl font-semibold capitalize tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
            {activeView}
          </h2>
          <DarkModeToggle darkMode={isDark} setDarkMode={toggleTheme} />
        </header>
        
        {/* View Container */}
        <div className="flex-1 overflow-hidden flex flex-col p-8 relative min-h-0">
          <div className="mx-auto max-w-[1600px] w-full animate-fade-in-up flex-1 flex flex-col min-h-0">
            {activeView === 'overview' && <OverviewView company={company} />}
            {activeView === 'leads' && <LeadsView company={company} />}
            {activeView === 'contatos' && <ContatosView company={company} />}
            {activeView === 'configuracoes' && <ConfiguracoesView company={company} profile={profile} />}
          </div>
        </div>
      </main>

    </div>
  );
}
