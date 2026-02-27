import React from 'react';

export const DarkModeToggle = ({ darkMode, setDarkMode }) => {
  return (
    <button 
      onClick={() => setDarkMode(!darkMode)} 
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors text-gray-500 dark:text-zinc-400"
    >
      {darkMode ? '☀' : '☽'}
    </button>
  );
};
