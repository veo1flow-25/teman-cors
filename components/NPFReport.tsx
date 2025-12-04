
import React, { useState, useEffect, useMemo } from 'react';
import { NPFReportFullData, NPFMonthRow } from '../types';
import AISummary from './AISummary';
import { useYear, useSearch } from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { AlertTriangle, Save, RefreshCw, TrendingUp, TrendingDown, Activity, Cloud, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label
} from 'recharts';

// --- MOCK INITIAL DATA ---

const SCHEMES = [
    { key: 't_tekun', label: 'T.TEKUN' },
    { key: 'temannita', label: 'TemanNita' },
    { key: 'teman_2', label: 'TEMAN 2.0' },
    { key: 'temannita_2', label: 'TemanNita 2.0' },
    { key: 'plus', label: 'PLUS' },
    { key: 'all', label: 'ALL' },
];

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const generateMockData = (year: number): NPFReportFullData => {
    // Helper to generate a row with some realistic looking NPF fluctuation
    const generateRow = (month: string, i: number, base: number) => {
        const variance = Math.sin(i / 2) * 0.5; // wavy pattern
        return {
            id: `npf_${i}`,
            month,
            schemes: SCHEMES.reduce((acc, s) => {
                // Different base rates for different schemes
                let schemeBase = base;
                if (s.key === 'teman_2') schemeBase = 7.5;
                if (s.key === 'temannita_2') schemeBase = 1.8;
                if (s.key === 'plus') schemeBase = 6.0;
                
                acc[s.key] = parseFloat((schemeBase + variance + (Math.random() * 0.2)).toFixed(2));
                return acc;
            }, {} as Record<string, number>)
        };
    };

    return {
        year,
        dataBil: MONTHS.map((m, i) => generateRow(m, i, 25.5)), // Base ~25% for Count
        dataRM: MONTHS.map((m, i) => generateRow(m, i, 16.5))  // Base ~16% for RM
    };
};

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const NPFReport: React.FC = () => {
    const { selectedYear } = useYear();
    const { searchQuery } = useSearch();
    const { user } = useAuth();
    const [data, setData] = useState<NPFReportFullData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [bilSort, setBilSort] = useState<SortConfig>(null);
    const [rmSort, setRMSort] = useState<SortConfig>(null);

    useEffect(() => {
        const loadData = async () => {
            const savedData = await api.getData('npf', selectedYear);
            if (savedData) {
                setData(savedData);
            } else {
                setData(generateMockData(selectedYear));
            }
        };
        loadData();
    }, [selectedYear]);

    // Auto Save
    const triggerAutoSave = async () => {
        if (!data) return;
        setSaveStatus('saving');
        await api.saveData('npf', selectedYear, data);
        setSaveStatus('saved');
        
        if (user?.email) {
            api.logActivity(user.email, 'UPDATE_NPF_REPORT', `Updated NPF report for ${selectedYear}`);
        }

        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleSave = async () => {
        await triggerAutoSave();
        setIsEditing(false);
    };

    const updateVal = (tableType: 'dataBil' | 'dataRM', rowId: string, schemeKey: string, val: string) => {
        if (!data) return;
        const numVal = parseFloat(val) || 0;
        const updatedList = data[tableType].map(row => {
            if (row.id === rowId) {
                return {
                    ...row,
                    schemes: { ...row.schemes, [schemeKey]: numVal }
                };
            }
            return row;
        });
        setData({ ...data, [tableType]: updatedList });
    };

    const sortData = (list: NPFMonthRow[], config: SortConfig) => {
        if (!config) return list;
        return [...list].sort((a, b) => {
            if (config.key === 'month') {
                const idxA = MONTHS.indexOf(a.month);
                const idxB = MONTHS.indexOf(b.month);
                return config.direction === 'asc' ? idxA - idxB : idxB - idxA;
            }
            const valA = a.schemes[config.key] || 0;
            const valB = b.schemes[config.key] || 0;
            return config.direction === 'asc' ? valA - valB : valB - valA;
        });
    };

    const handleBilSort = (key: string) => {
        setBilSort(prev => prev?.key === key && prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' });
    }

    const handleRMSort = (key: string) => {
        setRMSort(prev => prev?.key === key && prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' });
    }

    // Filter & Sort Logic
    const filteredBil = useMemo(() => {
        const list = data?.dataBil.filter(r => r.month.toLowerCase().includes(searchQuery.toLowerCase())) || [];
        return sortData(list, bilSort);
    }, [data, searchQuery, bilSort]);

    const filteredRM = useMemo(() => {
        const list = data?.dataRM.filter(r => r.month.toLowerCase().includes(searchQuery.toLowerCase())) || [];
        return sortData(list, rmSort);
    }, [data, searchQuery, rmSort]);

    // Export Logic
    const handleExport = (type: 'dataBil' | 'dataRM') => {
        if (!data) return;
        const headers = ['Bulan', ...SCHEMES.map(s => s.label)];
        const rows = (type === 'dataBil' ? data.dataBil : data.dataRM).map(r => [
            r.month,
            ...SCHEMES.map(s => r.schemes[s.key])
        ]);
        api.exportTableToCSV(`Prestasi_NPF_${type}_${selectedYear}`, headers, rows);
    }

    if (!data) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse flex flex-col items-center gap-2"><RefreshCw className="animate-spin text-brand-600"/> Memuatkan data NPF...</div>;

    // Prepare Chart Data (Comparing ALL Bil vs ALL RM)
    const chartData = data.dataBil.map((row, i) => ({
        month: row.month.substring(0, 3),
        npfBil: row.schemes['all'],
        npfRM: data.dataRM[i].schemes['all']
    }));

    const latestData = chartData[chartData.length - 1];
    const avgNPF_RM = chartData.reduce((acc, curr) => acc + curr.npfRM, 0) / chartData.length;
    const avgNPF_Bil = chartData.reduce((acc, curr) => acc + curr.npfBil, 0) / chartData.length;

    return (
        <div className="space-y-8 max-w-[1800px] mx-auto pb-20">
             {/* Header */}
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                     <div className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg shadow-sm border border-rose-100 dark:border-rose-900/30">
                        <AlertTriangle size={24} /> 
                     </div>
                     Laporan Prestasi NPF {selectedYear}
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-14">Pemantauan kadar Non-Performing Financing mengikut skim dan bulan.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <AISummary context="Analisis Risiko NPF" data={chartData} />
                    {(user?.role === 'admin' || user?.role === 'superadmin') && !searchQuery && (
                      <button 
                          onClick={() => setIsEditing(!isEditing)}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm border ${
                          isEditing 
                              ? 'bg-slate-900 text-white border-slate-900 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100' 
                              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'
                          }`}
                      >
                          {isEditing ? 'Selesai Suntingan' : 'Kemaskini Data'}
                      </button>
                    )}
                    
                     {/* Save Status Indicator */}
                    <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                        saveStatus === 'saved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' :
                        saveStatus === 'saving' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' :
                        'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-700 opacity-0'
                    }`}>
                        {saveStatus === 'saving' ? <RefreshCw className="animate-spin" size={14} /> : <Cloud size={14} />}
                        {saveStatus === 'saving' ? 'Menyimpan...' : 'Disimpan'}
                    </div>
                </div>
            </div>

            {/* CHART & METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Main Chart */}
                 <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white">Trend NPF Keseluruhan (%)</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Perbandingan Kadar NPF (Bilangan) vs NPF (Nilai RM).</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-1 bg-rose-500 rounded-full"></span>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">NPF (Bil)</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-1 bg-amber-500 rounded-full"></span>
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">NPF (RM)</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b'}} />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} domain={['auto', 'auto']} padding={{ top: 20, bottom: 20 }} />
                                <Tooltip 
                                    contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} 
                                    formatter={(value: number) => [`${value.toFixed(2)}%`]}
                                />
                                <Legend />
                                
                                {/* Reference Lines for Averages */}
                                <ReferenceLine y={avgNPF_Bil} stroke="#f43f5e" strokeDasharray="3 3" opacity={0.5}>
                                    <Label value={`Avg Bil: ${avgNPF_Bil.toFixed(2)}%`} position="insideBottomLeft" fill="#f43f5e" fontSize={10} />
                                </ReferenceLine>
                                <ReferenceLine y={avgNPF_RM} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.5}>
                                    <Label value={`Avg RM: ${avgNPF_RM.toFixed(2)}%`} position="insideTopLeft" fill="#f59e0b" fontSize={10} />
                                </ReferenceLine>

                                {/* Reference Line for Latest */}
                                <ReferenceLine x={latestData.month} stroke="#94a3b8" strokeDasharray="3 3">
                                    <Label value="Latest" position="insideTop" fill="#94a3b8" fontSize={10} />
                                </ReferenceLine>

                                {/* Data Lines */}
                                <Line type="monotone" dataKey="npfBil" name="NPF (Bil)" stroke="#f43f5e" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                                <Line type="monotone" dataKey="npfRM" name="NPF (RM)" stroke="#f59e0b" strokeWidth={2} dot={{r: 4}} activeDot={{r: 6}} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 {/* Metric Card */}
                 <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-center gap-6">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Purata NPF (RM) Tahunan</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-bold text-slate-800 dark:text-white">{avgNPF_RM.toFixed(2)}%</h3>
                            <span className="text-sm font-medium text-rose-500 flex items-center bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded-full">
                                <TrendingUp size={14} className="mr-1"/> +0.4%
                            </span>
                        </div>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-700 w-full"></div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Status Risiko Semasa</p>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Substandard</span>
                                <span className="font-bold text-amber-600 dark:text-amber-500">4.2%</span>
                            </div>
                             <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-500 w-[20%]"></div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Doubtful</span>
                                <span className="font-bold text-orange-600 dark:text-orange-500">2.1%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500 w-[10%]"></div>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Loss</span>
                                <span className="font-bold text-rose-600 dark:text-rose-500">1.5%</span>
                            </div>
                            <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 w-[8%]"></div>
                            </div>
                        </div>
                    </div>
                 </div>
            </div>

            {/* TABLES GRID */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* TABLE 4: NPF (BIL) */}
                <NPFTable 
                    title="Laporan Prestasi NPF (BIL)" 
                    rows={filteredBil} 
                    type="dataBil" 
                    isEditing={isEditing} 
                    onUpdate={updateVal} 
                    onSave={triggerAutoSave}
                    onExport={() => handleExport('dataBil')}
                    sortConfig={bilSort}
                    onSort={handleBilSort}
                />

                {/* TABLE 5: NPF (RM) */}
                <NPFTable 
                    title="Laporan Prestasi NPF (RM)" 
                    rows={filteredRM} 
                    type="dataRM" 
                    isEditing={isEditing} 
                    onUpdate={updateVal} 
                    onSave={triggerAutoSave}
                    onExport={() => handleExport('dataRM')}
                    sortConfig={rmSort}
                    onSort={handleRMSort}
                />
            </div>

        </div>
    );
};

// Reusable Sub-Component for the Tables
interface NPFTableProps {
    title: string;
    rows: NPFMonthRow[];
    type: 'dataBil' | 'dataRM';
    isEditing: boolean;
    onUpdate: (type: 'dataBil' | 'dataRM', id: string, scheme: string, val: string) => void;
    onSave?: () => void;
    onExport?: () => void;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
}

const NPFTable: React.FC<NPFTableProps> = ({ title, rows, type, isEditing, onUpdate, onSave, onExport, sortConfig, onSort }) => {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="bg-slate-50 dark:bg-slate-700/50 px-5 py-4 border-b border-slate-200 dark:border-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-sm flex items-center gap-2">
                        <Activity size={16} className={type === 'dataBil' ? 'text-blue-500' : 'text-emerald-500'} /> {title}
                    </h3>
                    <span className="text-[10px] font-bold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded text-slate-400 dark:text-slate-300">Unit: %</span>
                </div>
                {onExport && (
                    <button onClick={onExport} className="p-1.5 bg-white dark:bg-slate-700 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition" title="Muat Turun CSV">
                        <Download size={14}/>
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-center">
                    <thead className="bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 font-bold uppercase sticky top-0 z-10">
                        <tr>
                            <SortHeader label="Bulan" sortKey="month" sortConfig={sortConfig} onSort={onSort} className="w-32 text-left sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50" />
                            {SCHEMES.map(s => (
                                <SortHeader 
                                    key={s.key} 
                                    label={s.label}
                                    sortKey={s.key} 
                                    sortConfig={sortConfig} 
                                    onSort={onSort} 
                                    className={`px-2 py-3 border-r border-slate-200 dark:border-slate-700/50 min-w-[80px] ${s.key === 'all' ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white' : ''}`}
                                />
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {rows.map((row, idx) => (
                            <tr key={row.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/30 dark:bg-slate-800/50'}`}>
                                <td className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50 sticky left-0 bg-white dark:bg-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                    {row.month}
                                </td>
                                {SCHEMES.map(s => {
                                    const val = row.schemes[s.key];
                                    // High NPF Warning Color
                                    let colorClass = "text-slate-600 dark:text-slate-400";
                                    if (val > 20) colorClass = "text-rose-600 dark:text-rose-400 font-bold";
                                    else if (val > 10) colorClass = "text-amber-600 dark:text-amber-400 font-semibold";

                                    return (
                                        <td key={`${row.id}_${s.key}`} className={`px-2 py-2 border-r border-slate-100 dark:border-slate-700/50 ${s.key === 'all' ? 'bg-slate-50 dark:bg-slate-700/20 font-bold' : ''}`}>
                                            <EditCell 
                                                edit={isEditing} 
                                                val={val} 
                                                onChange={(v) => onUpdate(type, row.id, s.key, v)} 
                                                onBlur={onSave}
                                                className={colorClass}
                                            />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                         {rows.length === 0 && (
                            <tr><td colSpan={SCHEMES.length + 1} className="p-4 text-center text-slate-400 italic">Tiada data dijumpai.</td></tr>
                         )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const EditCell = ({ edit, val, onChange, onBlur, className }: { edit: boolean, val: number, onChange: (v: string) => void, onBlur?: () => void, className?: string }) => {
    const [local, setLocal] = useState<string | null>(null);

    if (edit) {
        return (
            <input 
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-1 py-1 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none text-center"
                value={local !== null ? local : val}
                onChange={e => {
                    setLocal(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={() => {
                    setLocal(null);
                    onBlur && onBlur();
                }}
            />
        )
    }
    return <div className={className}>{val.toFixed(2)}</div>;
}

interface SortHeaderProps {
    label: React.ReactNode;
    sortKey: string;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
    className?: string;
}

const SortHeader: React.FC<SortHeaderProps> = ({ label, sortKey, sortConfig, onSort, className }) => {
    const isActive = sortConfig?.key === sortKey;
    return (
        <th 
            className={`cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none group ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center justify-center gap-1">
                {label}
                <span className="opacity-30 group-hover:opacity-100 transition-opacity">
                    {isActive ? (
                        sortConfig?.direction === 'asc' ? <ArrowUp size={12}/> : <ArrowDown size={12}/>
                    ) : (
                        <ArrowUpDown size={12} />
                    )}
                </span>
            </div>
        </th>
    )
}

export default NPFReport;
