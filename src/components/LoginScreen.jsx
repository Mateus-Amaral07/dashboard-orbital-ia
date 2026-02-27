import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { DarkModeToggle } from './DarkModeToggle';

const LogoImage = ({ isDark, className }) => {
  return (
    <img 
      src={isDark ? "/logo.png" : "/black_logo.png"} 
      alt="Orbital IA" 
      className={className} 
    />
  );
};

export const LoginScreen = ({ darkMode, setDarkMode }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError('Credenciais inválidas ou erro na conexão.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-950 transition-colors duration-200">
      <div className="absolute top-4 right-4 animate-fade-in">
        <DarkModeToggle darkMode={darkMode} setDarkMode={setDarkMode} />
      </div>

      <div className="max-w-md w-full p-8 bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none border border-gray-100 dark:border-zinc-800 animate-slide-up">
        <div className="text-center mb-8">
          <LogoImage isDark={darkMode} className="h-10 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-400 dark:text-gray-500 mb-6 tracking-wide">Orbital IA</p>
          <div className="h-px w-16 bg-gray-200 dark:bg-zinc-800 mx-auto mb-6"></div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-zinc-100">Dashboard</h2>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && <div className="p-3 bg-red-50 dark:bg-zinc-800/50 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Email</label>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              placeholder="seu@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">Senha</label>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full px-4 py-2.5 rounded-lg bg-white dark:bg-zinc-800 border border-gray-300 dark:border-zinc-700 text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-medium rounded-lg transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400 dark:text-zinc-500">Powered by Orbital IA</p>
        </div>
      </div>
    </div>
  );
};
