import React from 'react';

export const formatDateAndLocale = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR');
};

export const formatNumberValue = (value, format) => {
  if (value == null || value === '') return '-';
  const num = Number(value);
  if (isNaN(num)) return value;

  switch (format) {
    case 'percent':
      return `${num}%`;
    case 'currency_brl':
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    case 'currency_usd':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
    case 'number':
    default:
      return new Intl.NumberFormat('pt-BR').format(num);
  }
};

export const formatValue = (type, val, options = [], numberFormat = 'number') => {
  if (val == null || val === '') return '-';
  if (type === 'boolean') {
    return val 
      ? React.createElement('span', { className: 'px-2 py-0.5 rounded text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' }, 'Sim') 
      : React.createElement('span', { className: 'px-2 py-0.5 rounded text-xs bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-zinc-300' }, 'Não');
  }
  if (type === 'date') return formatDateAndLocale(val);
  if (type === 'number') return formatNumberValue(val, numberFormat);
  if (type === 'dropdown') {
    const opt = options.find(o => o.label === val);
    const color = opt ? opt.color : '#d1d5db';
    return React.createElement('span', {
      className: 'px-2.5 py-1 rounded-full text-xs font-medium border text-gray-900 dark:text-zinc-100 whitespace-nowrap',
      style: { backgroundColor: `${color}20`, borderColor: `${color}40` }
    }, 
      React.createElement('span', {
        className: 'inline-block w-2 h-2 rounded-full mr-1.5',
        style: { backgroundColor: color }
      }),
      val
    );
  }
  return String(val);
};
