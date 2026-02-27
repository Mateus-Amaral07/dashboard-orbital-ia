const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\mateu\\Documents\\work\\orbital-ia\\sistemas\\dashboard-agente_disparos\\src';
const appJsx = fs.readFileSync(path.join(srcDir, 'App.jsx'), 'utf-8');
const lines = appJsx.split('\n');

function extract(start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const iconsDef = `
const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
`;

// 1. OverviewView (157 to 686)
const overviewCore = extract(157, 686).replace('const OverviewView =', 'export const OverviewView =');
const overviewFile = `import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatNumberValue } from '../utils/formatters';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LineChart, Line, RadialBarChart, RadialBar, PolarAngleAxis, AreaChart, Area, Legend } from 'recharts';

${overviewCore}
`;
fs.writeFileSync(path.join(srcDir, 'views', 'OverviewView.jsx'), overviewFile);

// 2. LeadsView (688 to 1022)
const leadsCore = extract(688, 1022).replace('const LeadsView =', 'export const LeadsView =');
const leadsFile = `import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateAndLocale, formatValue, formatNumberValue } from '../utils/formatters';

const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;

${leadsCore}
`;
fs.writeFileSync(path.join(srcDir, 'views', 'LeadsView.jsx'), leadsFile);

// 3. ContactsView (1024 to 1188)
const contatosCore = extract(1024, 1188).replace('const ContatosView =', 'export const ContatosView =');
const contatosFile = `import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatDateAndLocale } from '../utils/formatters';

const SearchIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

${contatosCore}
`;
fs.writeFileSync(path.join(srcDir, 'views', 'ContactsView.jsx'), contatosFile);

// 4. SettingsView (1190 to 1527) - updated to include EditIcon and TrashIcon
const configCore = extract(1190, 1527).replace('const ConfiguracoesView =', 'export const ConfiguracoesView =');
const configFile = `import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const EditIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;
const TrashIcon = () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;

${configCore}
`;
fs.writeFileSync(path.join(srcDir, 'views', 'SettingsView.jsx'), configFile);

console.log('Extraction complete.');
