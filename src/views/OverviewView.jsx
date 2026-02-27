import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { formatNumberValue } from '../utils/formatters';
import { PieChart, Pie, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, LineChart, Line, RadialBarChart, RadialBar, PolarAngleAxis, AreaChart, Area, Legend } from 'recharts';

export const OverviewView = ({ company }) => {
  const [leads, setLeads] = useState([]);
  const [config, setConfig] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const analyzeField = (fieldConfig, allLeads) => {
    // 1 & 2. Extract values and parse JSON
    const values = allLeads.map(lead => {
      let meta = lead.metadata;
      try {
        meta = typeof lead.metadata === 'string' ? JSON.parse(lead.metadata) : lead.metadata;
      } catch (e) {
        meta = {};
      }
      return meta?.[fieldConfig.field_key];
    }).filter(v => v != null && v !== '');

    // 3. Significance check
    if (values.length < 3) return { chartable: false };

    const filledCount = values.length;
    const totalCount = allLeads.length;

    // Field Type Specific Logic
    if (fieldConfig.field_type === 'boolean') {
      const trueCount = values.filter(v => v === true || v === 'true').length;
      const falseCount = values.filter(v => v === false || v === 'false').length;
      return {
        chartable: true,
        type: 'donut',
        data: [{ name: 'Sim', value: trueCount }, { name: 'Não', value: falseCount }],
        filledCount,
        totalCount
      };
    }

    if (fieldConfig.field_type === 'dropdown') {
      const options = fieldConfig.options || [];
      const counts = {};
      options.forEach(opt => counts[opt.label] = 0);
      values.forEach(v => {
        if (counts[v] !== undefined) counts[v]++;
        else counts[v] = 1;
      });
      
      const data = Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a,b) => b.value - a.value);
      
      // If <= 5 defined options => DONUT
      if (options.length <= 5) {
        return {
          chartable: true,
          type: 'donut',
          data,
          filledCount,
          totalCount
        };
      } else {
        return {
          chartable: true,
          type: 'bar_horizontal',
          data,
          filledCount,
          totalCount
        };
      }
    }

    if (fieldConfig.field_type === 'text') {
      const distinct = new Set(values);
      if (distinct.size > 8) return { chartable: false };
      
      const counts = {};
      values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
      const data = Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a,b) => b.value - a.value);
      
      return {
        chartable: true,
        type: 'bar_horizontal',
        data,
        filledCount,
        totalCount
      };
    }

    if (fieldConfig.field_type === 'number') {
      const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
      if (nums.length < 3) return { chartable: false };

      const min = Math.min(...nums);
      const max = Math.max(...nums);
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const stdDev = Math.sqrt(nums.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / nums.length);
      const distinct = new Set(nums).size;

      if (min >= 0 && max <= 100 && stdDev > 5) {
        return {
          chartable: true,
          type: 'radial',
          data: [{ name: 'Média', value: parseFloat(mean.toFixed(1)), fill: '#3b82f6' }],
          mean: mean.toFixed(1),
          rawMean: mean,
          rawMin: min,
          rawMax: max,
          min,
          max,
          filledCount,
          totalCount
        };
      } else if (distinct <= 10) {
        const counts = {};
        nums.forEach(n => { counts[n] = (counts[n] || 0) + 1; });
        const data = Object.keys(counts).map(k => ({ name: Number(k), formattedName: formatNumberValue(Number(k), fieldConfig.number_format), value: counts[k] })).sort((a,b) => a.name - b.name);
        return {
          chartable: true,
          type: 'bar_vertical',
          data,
          mean: mean.toFixed(1),
          rawMean: mean,
          filledCount,
          totalCount
        };
      } else {
        // Histogram
        const bucketSize = (max - min) / 5;
        const buckets = Array.from({ length: 5 }, (_, i) => {
          const bMin = min + i * bucketSize;
          const bMax = i === 4 ? max + 0.01 : min + (i + 1) * bucketSize;
          return {
            min: bMin,
            max: bMax,
            count: 0,
            label: `${formatNumberValue(bMin, fieldConfig.number_format)} – ${formatNumberValue(bMax, fieldConfig.number_format)}`
          };
        });
        
        nums.forEach(n => {
          const bucket = buckets.find(b => n >= b.min && n < b.max);
          if (bucket) bucket.count++;
        });

        const data = buckets.map(b => ({ name: b.label, value: b.count }));
        return {
          chartable: true,
          type: 'histogram',
          data,
          mean: mean.toFixed(1),
          rawMean: mean,
          filledCount,
          totalCount
        };
      }
    }

    if (fieldConfig.field_type === 'date') {
      const dates = values.map(v => new Date(v)).filter(d => !isNaN(d.getTime()));
      if (dates.length < 3) return { chartable: false };

      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date(Math.max(...dates));
      const diffMonths = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth());

      const counts = {};
      dates.forEach(d => {
        let key;
        if (diffMonths > 1) {
          key = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
        } else {
          const startOfYear = new Date(d.getFullYear(), 0, 1);
          const pastDaysOfYear = (d - startOfYear) / 86400000;
          const weekNum = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
          key = `Sem. ${weekNum}`;
        }
        counts[key] = (counts[key] || 0) + 1;
      });

      // Maintain chronological order for Line Chart
      const data = [];
      if (diffMonths > 1) {
        let current = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
        while (current <= maxDate) {
          const key = current.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
          data.push({ name: key, value: counts[key] || 0 });
          current.setMonth(current.getMonth() + 1);
        }
      } else {
         Object.keys(counts).forEach(k => data.push({ name: k, value: counts[k] }));
      }

      return {
        chartable: true,
        type: 'line',
        data,
        filledCount,
        totalCount
      };
    }

    return { chartable: false };
  };

  const todayStr = new Date().toISOString().split('T')[0];
  const stats = useMemo(() => ({
    total: leads.length,
    interested: leads.filter(l => l.demonstrou_interesse).length,
    manual: leads.filter(l => l.foi_resposta_manual).length,
    today: leads.filter(l => l.created_at?.startsWith(todayStr)).length
  }), [leads, todayStr]);

  const customCharts = useMemo(() => {
    return config.map(c => ({ config: c, analysis: analyzeField(c, leads) })).filter(item => item.analysis.chartable);
  }, [config, leads]);

  // Standard Charts Processing
  const standardChartsData = useMemo(() => {
    // 1. Volume de Leads — Últimos 30 dias
    const volumeData = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Initialize 30 days
    for (let i = 0; i < 30; i++) {
       const d = new Date(thirtyDaysAgo);
       d.setDate(d.getDate() + i);
       const key = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
       volumeData.push({ name: key, total: 0, interessados: 0, dateKey: d.toISOString().split('T')[0] });
    }

    // 2. Leads por Dia da Semana
    const weekdays = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
    const weekdayData = weekdays.map(day => ({ name: day, value: 0 }));

    // 3. Distribuição por Horário
    const hourBuckets = [
      { name: '0h', min: 0, max: 2, value: 0 },
      { name: '3h', min: 3, max: 5, value: 0 },
      { name: '6h', min: 6, max: 8, value: 0 },
      { name: '9h', min: 9, max: 11, value: 0 },
      { name: '12h', min: 12, max: 14, value: 0 },
      { name: '15h', min: 15, max: 17, value: 0 },
      { name: '18h', min: 18, max: 20, value: 0 },
      { name: '21h', min: 21, max: 23, value: 0 }
    ];

    leads.forEach(lead => {
      const d = new Date(lead.created_at);
      if (isNaN(d.getTime())) return;
      
      const localDateStr = d.toLocaleDateString('en-CA'); // YYYY-MM-DD local format
      const localHour = d.getHours();
      const localDay = d.getDay();

      // Volume logic
      if (d >= thirtyDaysAgo && d <= today) {
        const volumeEntry = volumeData.find(v => v.dateKey === localDateStr);
        if (volumeEntry) {
           volumeEntry.total += 1;
           if (lead.demonstrou_interesse) volumeEntry.interessados += 1;
        }
      }

      // Weekday logic
      weekdayData[localDay].value += 1;

      // Hour logic
      const bucket = hourBuckets.find(b => localHour >= b.min && localHour <= b.max);
      if (bucket) bucket.value += 1;
    });

    return {
       volumeData,
       weekdayData,
       hourData: hourBuckets.map(b => ({ name: b.name, value: b.value }))
    };
  }, [leads]);

  const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4']; // Blue, Emerald, Amber, Rose, Purple, Cyan

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-zinc-800 p-2 border border-gray-100 dark:border-zinc-700 shadow-lg rounded-lg text-sm">
          <p className="font-semibold dark:text-zinc-200 mb-1">{label}</p>
          <p className="text-blue-600 dark:text-blue-400 font-medium">
            {payload[0].name === 'value' ? 'Count: ' : `${payload[0].name}: `}
            {formatter ? formatter(payload[0].value) : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full space-y-6 pb-2 animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-gray-200 dark:bg-zinc-800 h-24 rounded-xl"></div>)}
        </div>
        <div className="bg-gray-200 dark:bg-zinc-800 h-64 rounded-xl"></div>
      </div>
    );
  }

  const renderStandardLegend = (props) => {
    const { payload } = props;
    return (
      <ul className="flex justify-center gap-6 mt-2 text-xs">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center text-gray-600 dark:text-zinc-400">
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ backgroundColor: entry.color }}></span>
            {entry.value}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-8 pb-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-zinc-700">
      
      {/* High-Level Overview KPIs */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4 tracking-tight">Visão Geral</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total de Leads', value: stats.total, color: 'text-blue-600 dark:text-blue-400' },
            { label: 'Demonstraram Interesse', value: stats.interested, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Respostas Manuais', value: stats.manual, color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Leads Hoje', value: stats.today, color: 'text-rose-600 dark:text-rose-400' }
          ].map((stat, i) => (
            <div key={i} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col justify-center transition-transform hover:-translate-y-1">
              <span className="text-sm text-gray-500 dark:text-zinc-400 font-medium mb-1">{stat.label}</span>
              <span className={`text-3xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Standard Charts Section */}
      <section className="space-y-6">
        
        {/* Chart 1 */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col w-full">
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 dark:text-zinc-200">Volume de Leads — Últimos 30 dias</h4>
            <p className="text-xs text-gray-500 dark:text-zinc-400">Novos leads por dia vs. leads com interesse</p>
          </div>
          <div className="flex-1 mt-2 min-h-[260px]">
             <ResponsiveContainer width="100%" height={260}>
               <AreaChart data={standardChartsData.volumeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                 <defs>
                   <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorInteresse" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                 <XAxis dataKey="name" fontSize={11} tick={{fill: '#888'}} />
                 <YAxis fontSize={11} tick={{fill: '#888'}} />
                 <Tooltip content={<CustomTooltip />} />
                 <Legend content={renderStandardLegend} />
                 <Area type="monotone" dataKey="total" name="Total" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                 <Area type="monotone" dataKey="interessados" name="Com interesse" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorInteresse)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* Charts 2 and 3 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col w-full">
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 dark:text-zinc-200">Leads por Dia da Semana</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Quando seus leads chegam</p>
            </div>
            <div className="flex-1 mt-2 min-h-[260px]">
               <ResponsiveContainer width="100%" height={260}>
                 <BarChart data={standardChartsData.weekdayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                   <XAxis dataKey="name" fontSize={11} tick={{fill: '#888'}} />
                   <YAxis fontSize={11} tick={{fill: '#888'}} />
                   <Tooltip content={<CustomTooltip />} cursor={{fill: '#888', opacity: 0.1}}/>
                   <Bar dataKey="value" name="Leads" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col w-full">
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 dark:text-zinc-200">Distribuição por Horário</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Horários de pico de chegada</p>
            </div>
            <div className="flex-1 mt-2 min-h-[260px]">
               <ResponsiveContainer width="100%" height={260}>
                 <BarChart data={standardChartsData.hourData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                   <XAxis dataKey="name" fontSize={11} tick={{fill: '#888'}} />
                   <YAxis fontSize={11} tick={{fill: '#888'}} />
                   <Tooltip content={<CustomTooltip />} cursor={{fill: '#888', opacity: 0.1}}/>
                   <Bar dataKey="value" name="Leads" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={40} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
          </div>
        </div>

      </section>

      {/* Custom Fields Charts Section */}
      <section>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mb-4 tracking-tight">Campos Personalizados</h3>
        
        {customCharts.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm text-center">
             <p className="text-gray-500 dark:text-zinc-400">Configure campos personalizados em Configurações para desbloquear gráficos personalizados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {customCharts.map(item => (
              <div key={item.config.id} className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col">
                <div className="mb-4">
                  <h4 className="font-semibold text-gray-800 dark:text-zinc-200">{item.config.field_label}</h4>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">{item.analysis.filledCount} de {item.analysis.totalCount} leads preenchidos</p>
                  {(item.analysis.type === 'radial' || item.analysis.type === 'bar_vertical' || item.analysis.type === 'histogram') && (
                    <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-1">
                      Média: {formatNumberValue(item.analysis.rawMean, item.config.number_format)} {item.analysis.type === 'radial' && `| Mín: ${formatNumberValue(item.analysis.rawMin, item.config.number_format)} | Máx: ${formatNumberValue(item.analysis.rawMax, item.config.number_format)}`}
                    </p>
                  )}
                </div>
                
                <div className="flex-1 mt-2 min-h-[220px]">
                  <ResponsiveContainer width="100%" height={220}>
                    {item.analysis.type === 'donut' ? (
                      <PieChart>
                        <Pie
                          data={item.analysis.data}
                          cx="50%"
                          cy="50%"
                          innerRadius="60%"
                          outerRadius="80%"
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {item.analysis.data.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-zinc-100 font-bold text-xl">
                           {item.analysis.filledCount > 0 ? `${((item.analysis.data[0]?.value / item.analysis.filledCount) * 100).toFixed(0)}%` : '0%'}
                        </text>
                      </PieChart>
                    ) : item.analysis.type === 'bar_horizontal' ? (
                      <BarChart data={item.analysis.data} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#374151" opacity={0.2} />
                        <XAxis type="number" fontSize={11} tick={{fill: '#888'}} />
                        <YAxis dataKey="name" type="category" width={80} fontSize={11} tick={{fill: '#888'}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#888', opacity: 0.1}}/>
                        <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                          {item.analysis.data.map((entry, index) => (
                             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : (item.analysis.type === 'bar_vertical' || item.analysis.type === 'histogram') ? (
                      <BarChart data={item.analysis.data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                        <XAxis dataKey={item.analysis.type === 'bar_vertical' ? 'formattedName' : 'name'} fontSize={11} tick={{fill: '#888'}} />
                        <YAxis fontSize={11} tick={{fill: '#888'}} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: '#888', opacity: 0.1}}/>
                        <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    ) : item.analysis.type === 'radial' ? (
                       <RadialBarChart 
                         cx="50%" cy="50%" 
                         innerRadius="70%" outerRadius="100%" 
                         barSize={15} 
                         data={item.analysis.data}
                         startAngle={180} endAngle={0}
                       >
                         <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                         <RadialBar background clockWise dataKey="value" cornerRadius={10} />
                         <Tooltip content={<CustomTooltip formatter={(val) => formatNumberValue(val, item.config.number_format)} />} />
                         <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-gray-900 dark:fill-zinc-100 font-bold text-2xl">
                           {formatNumberValue(item.analysis.rawMean, item.config.number_format)}
                         </text>
                       </RadialBarChart>
                    ) : item.analysis.type === 'line' ? (
                      <LineChart data={item.analysis.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" opacity={0.2} />
                        <XAxis dataKey="name" fontSize={11} tick={{fill: '#888'}} />
                        <YAxis fontSize={11} tick={{fill: '#888'}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                      </LineChart>
                    ) : null}
                  </ResponsiveContainer>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
      
    </div>
  );
};
