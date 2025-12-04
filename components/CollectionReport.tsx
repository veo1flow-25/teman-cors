
import React, { useState, useEffect, useMemo } from 'react';
import { CollectionReportFullData, CollectionMonthData } from '../types';
import { useYear, useSearch } from './Layout';
import { useAuth } from '../contexts/AuthContext';
import AISummary from './AISummary';
import { api } from '../services/api';
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart
} from 'recharts';
import { 
    HandCoins, Save, RefreshCw, Edit2, TrendingUp, Cloud, Download, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// --- MOCK CONSTANTS ---

const SCHEMES = [
    { key: 'teman_tekun', label: 'TEMAN TEKUN' },
    { key: 'temannita', label: 'TemanNita' },
    { key: 'teman_2', label: 'TEMAN 2.0' },
    { key: 'temannita_2', label: 'TemanNita 2.0' },
    { key: 'plus', label: 'PLUS' }
];

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const generateInitialData = (year: number): CollectionReportFullData => {
    return {
        year,
        months: MONTHS.map((m, i) => ({
            id: `col_${i}`,
            month: m,
            schemes: SCHEMES.reduce((acc, scheme) => {
                // Mock random data
                acc[scheme.key] = {
                    pk: Math.floor(Math.random() * 500000) + 100000,
                    dk: Math.floor(Math.random() * 600000) + 120000
                };
                return acc;
            }, {} as Record<string, { pk: number, dk: number }>)
        }))
    };
};

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const CollectionReport: React.FC = () => {
    const { selectedYear } = useYear();
    const { searchQuery } = useSearch();
    const { user } = useAuth();
    const [data, setData] = useState<CollectionReportFullData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);

    useEffect(() => {
        const loadData = async () => {
            const savedData = await api.getData('collection', selectedYear);
            if (savedData) {
                setData(savedData);
            } else {
                setData(generateInitialData(selectedYear));
            }
        };
        loadData();
    }, [selectedYear]);

    // Auto Save
    const triggerAutoSave = async () => {
        if (!data) return;
        setSaveStatus('saving');
        await api.saveData('collection', selectedYear, data);
        setSaveStatus('saved');
        
        if (user?.email) {
            api.logActivity(user.email, 'UPDATE_COLLECTION_REPORT', `Updated collection report for ${selectedYear}`);
        }

        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleSave = async () => {
        await triggerAutoSave();
        setIsEditing(false);
    };

    const updateVal = (monthIndex: number, schemeKey: string, field: 'pk' | 'dk', val: string) => {
        if (!data) return;
        const numVal = parseFloat(val.replace(/,/g, '')) || 0;
        const newMonths = [...data.months];
        newMonths[monthIndex].schemes[schemeKey][field] = numVal;
        setData({ ...data, months: newMonths });
    };

    const formatMoney = (val: number) => val.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatPercent = (pk: number, dk: number) => {
        if (!dk) return '0.00';
        return ((pk / dk) * 100).toFixed(2);
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => prev?.key === key && prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' });
    }

    // Filter & Sort Logic
    const filteredMonths = useMemo(() => {
        let list = data ? data.months.filter(m => m.month.toLowerCase().includes(searchQuery.toLowerCase())) : [];
        
        if (sortConfig) {
            list = [...list].sort((a, b) => {
                let valA, valB;

                if (sortConfig.key === 'month') {
                    // Custom sort for months to keep calendar order if sorting by month name
                    const idxA = MONTHS.indexOf(a.month);
                    const idxB = MONTHS.indexOf(b.month);
                    return sortConfig.direction === 'asc' ? idxA - idxB : idxB - idxA;
                }
                
                // Sort by specific scheme values (e.g. key="teman_tekun.pk")
                const [scheme, field] = sortConfig.key.split('.');
                if (scheme && field) {
                    valA = a.schemes[scheme]?.[field as 'pk'|'dk'] || 0;
                    valB = b.schemes[scheme]?.[field as 'pk'|'dk'] || 0;
                    return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
                }
                
                return 0;
            });
        }
        return list;
    }, [data, searchQuery, sortConfig]);

    // --- CALCULATIONS FOR TOTALS ---
    const calculateRowTotal = (monthData: CollectionMonthData) => {
        let totalPK = 0;
        let totalDK = 0;
        Object.values(monthData.schemes).forEach(s => {
            totalPK += s.pk;
            totalDK += s.dk;
        });
        return { pk: totalPK, dk: totalDK };
    };

    const grandTotals = useMemo(() => {
        if (!data) return { schemes: {}, grandPK: 0, grandDK: 0 };
        const totals: Record<string, { pk: number, dk: number }> = {};
        SCHEMES.forEach(s => totals[s.key] = { pk: 0, dk: 0 });
        let grandPK = 0;
        let grandDK = 0;

        data.months.forEach(m => {
            SCHEMES.forEach(s => {
                totals[s.key].pk += m.schemes[s.key].pk;
                totals[s.key].dk += m.schemes[s.key].dk;
            });
            const mTotal = calculateRowTotal(m);
            grandPK += mTotal.pk;
            grandDK += mTotal.dk;
        });

        return { schemes: totals, grandPK, grandDK };
    }, [data]);
    
    // Prepare Chart Data (Monthly Trend)
    const chartData = useMemo(() => {
        if (!data) return [];
        return data.months.map(m => {
            const t = calculateRowTotal(m);
            return {
                name: m.month.substring(0, 3),
                pk: t.pk,
                dk: t.dk,
                percent: t.dk ? (t.pk/t.dk)*100 : 0
            };
        });
    }, [data]);

    // Export Logic
    const handleExport = () => {
        if (!data) return;
        const headers = ['Bulan', 'Metrik', ...SCHEMES.map(s => s.label), 'Keseluruhan'];
        const rows: any[] = [];
        data.months.forEach(m => {
            // PK Row
            const pkRow: (string | number)[] = [m.month, 'PK (RM)'];
            let totalPK = 0;
            SCHEMES.forEach(s => {
                const v = m.schemes[s.key].pk;
                totalPK += v;
                pkRow.push(v);
            });
            pkRow.push(totalPK);
            rows.push(pkRow);
            
            // DK Row
            const dkRow: (string | number)[] = [m.month, 'DK (RM)'];
            let totalDK = 0;
            SCHEMES.forEach(s => {
                const v = m.schemes[s.key].dk;
                totalDK += v;
                dkRow.push(v);
            });
            dkRow.push(totalDK);
            rows.push(dkRow);
        });

        api.exportTableToCSV(`Prestasi_Kutipan_${selectedYear}`, headers, rows);
    }

    if (!data) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse flex flex-col items-center gap-2"><RefreshCw className="animate-spin text-brand-600"/> Memuatkan Data...</div>;

    return (
        <div className="space-y-8 max-w-[1800px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                     <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-900/30">
                        <HandCoins size={24} /> 
                     </div>
                     Laporan Prestasi Kutipan {selectedYear}
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-14">Pemantauan prestasi kutipan (PK) berbanding Dapat Kutip (DK).</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <AISummary context="Analisis Prestasi Kutipan" data={chartData} />
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

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">Trend Kutipan Bulanan (PK vs DK)</h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                                <YAxis tickFormatter={(val) => `${val/1000}k`} tick={{fontSize: 10, fill: '#64748b'}} />
                                <Tooltip 
                                    formatter={(val: number) => `RM ${val.toLocaleString()}`} 
                                    contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px'}}
                                />
                                <Legend />
                                <Bar dataKey="pk" name="Prestasi Kutipan (PK)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                                <Bar dataKey="dk" name="Dapat Kutip (DK)" fill="#64748b" radius={[4, 4, 0, 0]} barSize={20} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">Peratusan Pencapaian (%)</h3>
                    <div className="h-72">
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                                <YAxis domain={[0, 150]} tick={{fontSize: 10, fill: '#64748b'}} />
                                <Tooltip 
                                    formatter={(val: number) => `${val.toFixed(2)}%`}
                                    contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px'}} 
                                />
                                <Legend />
                                <Line type="monotone" dataKey="percent" name="% Pencapaian" stroke="#f59e0b" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                                <Line type="monotone" dataKey={() => 100} name="Sasaran 100%" stroke="#ef4444" strokeDasharray="5 5" strokeWidth={1} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* MAIN TABLE */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
                <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-sm">Laporan Prestasi Kutipan {selectedYear}</h3>
                    <button onClick={handleExport} className="flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                        <Download size={12}/> CSV
                    </button>
                </div>
                
                {/* Scrollable Container */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse text-slate-600 dark:text-slate-300">
                        <thead className="bg-slate-100 dark:bg-slate-700/30 text-slate-600 dark:text-slate-400 uppercase font-bold sticky top-0 z-10 shadow-sm">
                            <tr>
                                <SortHeader label="Bulan" sortKey="month" sortConfig={sortConfig} onSort={handleSort} rowSpan={2} className="w-[120px] text-left sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50" />
                                <th rowSpan={2} className="px-3 py-3 border-r border-slate-200 dark:border-slate-700/50 text-left min-w-[100px] bg-slate-100 dark:bg-slate-800 sticky left-[120px] z-20">Metrik</th>
                                {SCHEMES.map(s => (
                                    <th key={s.key} className="px-4 py-2 border-r border-slate-200 dark:border-slate-700/50 min-w-[140px] text-center bg-white dark:bg-slate-800">{s.label}</th>
                                ))}
                                <th className="px-4 py-2 min-w-[140px] text-center bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">Keseluruhan</th>
                            </tr>
                            <tr>
                                {SCHEMES.map(s => <th key={`${s.key}_sub`} className="h-1 bg-slate-50 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700/50"></th>)}
                                <th className="bg-slate-200 dark:bg-slate-700 border-l border-slate-300 dark:border-slate-600"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                            {filteredMonths.map((m, mIdx) => {
                                const rowTotal = calculateRowTotal(m);
                                const totalPercent = formatPercent(rowTotal.pk, rowTotal.dk);
                                
                                // Find actual index in original data for updating
                                const originalIndex = data.months.findIndex(om => om.id === m.id);

                                return (
                                    <React.Fragment key={m.id}>
                                        {/* PK ROW */}
                                        <tr className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                                            <td rowSpan={3} className="px-4 py-3 border-r border-slate-200 dark:border-slate-700/50 border-b border-slate-300 dark:border-slate-600 font-bold text-slate-700 dark:text-slate-300 align-top bg-white dark:bg-slate-800 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="sticky top-4">{m.month}</div>
                                            </td>
                                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700/50 text-left font-semibold text-slate-500 dark:text-slate-400 sticky left-[120px] bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400" onClick={() => handleSort('scheme_pk')}>
                                                PK (RM)
                                            </td>
                                            {SCHEMES.map(s => (
                                                <td key={`${s.key}_pk`} className="px-2 py-2 border-r border-slate-100 dark:border-slate-700/50 text-right cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors" onClick={() => handleSort(`${s.key}.pk`)}>
                                                    <EditCell edit={isEditing} val={m.schemes[s.key].pk} onChange={v => updateVal(originalIndex, s.key, 'pk', v)} onBlur={triggerAutoSave} />
                                                </td>
                                            ))}
                                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-700/50 text-right font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-700/20">
                                                {formatMoney(rowTotal.pk)}
                                            </td>
                                        </tr>

                                        {/* DK ROW */}
                                        <tr className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30 group">
                                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700/50 text-left font-semibold text-slate-500 dark:text-slate-400 sticky left-[120px] bg-white dark:bg-slate-800 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] cursor-pointer hover:text-slate-700 dark:hover:text-slate-300" onClick={() => handleSort('scheme_dk')}>
                                                DK (RM)
                                            </td>
                                            {SCHEMES.map(s => (
                                                <td key={`${s.key}_dk`} className="px-2 py-2 border-r border-slate-100 dark:border-slate-700/50 text-right text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors" onClick={() => handleSort(`${s.key}.dk`)}>
                                                    <EditCell edit={isEditing} val={m.schemes[s.key].dk} onChange={v => updateVal(originalIndex, s.key, 'dk', v)} onBlur={triggerAutoSave} />
                                                </td>
                                            ))}
                                            <td className="px-2 py-2 border-r border-slate-100 dark:border-slate-700/50 text-right font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/20">
                                                {formatMoney(rowTotal.dk)}
                                            </td>
                                        </tr>

                                        {/* % ROW */}
                                        <tr className="bg-cyan-50/40 dark:bg-cyan-900/10 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 border-b border-slate-300 dark:border-slate-600">
                                            <td className="px-3 py-2 border-r border-slate-200 dark:border-slate-700/50 text-left font-bold text-slate-700 dark:text-slate-300 sticky left-[120px] bg-cyan-50/40 dark:bg-cyan-900/10 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">%</td>
                                            {SCHEMES.map(s => {
                                                const p = formatPercent(m.schemes[s.key].pk, m.schemes[s.key].dk);
                                                const val = parseFloat(p);
                                                return (
                                                    <td key={`${s.key}_pct`} className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700/50 text-right font-bold ${val >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-300'}`}>
                                                        {p}%
                                                    </td>
                                                );
                                            })}
                                            <td className={`px-2 py-2 border-r border-slate-200 dark:border-slate-700/50 text-right font-bold ${parseFloat(totalPercent) >= 100 ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'} bg-cyan-100/50 dark:bg-cyan-900/20`}>
                                                {totalPercent}%
                                            </td>
                                        </tr>
                                    </React.Fragment>
                                );
                            })}
                            
                            {/* GRAND TOTALS - HIDE DURING SEARCH */}
                            {!searchQuery && (
                                <>
                                    <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold border-t-2 border-slate-900 dark:border-slate-700">
                                        <td rowSpan={3} className="px-4 py-3 border-r border-slate-700 dark:border-slate-800 align-middle sticky left-0 z-10 bg-slate-800 dark:bg-slate-900">JUMLAH</td>
                                        <td className="px-3 py-2 border-r border-slate-700 dark:border-slate-800 text-left bg-slate-800 dark:bg-slate-900 sticky left-[120px] z-10">PK (RM)</td>
                                        {SCHEMES.map(s => (
                                            <td key={`total_pk_${s.key}`} className="px-2 py-2 border-r border-slate-700 dark:border-slate-800 text-right bg-slate-800 dark:bg-slate-900 text-emerald-300">
                                                {formatMoney(grandTotals.schemes[s.key]?.pk || 0)}
                                            </td>
                                        ))}
                                        <td className="px-2 py-2 text-right bg-slate-900 dark:bg-black text-emerald-400 border-l border-slate-700 dark:border-slate-800">{formatMoney(grandTotals.grandPK)}</td>
                                    </tr>
                                    <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold">
                                        <td className="px-3 py-2 border-r border-slate-700 dark:border-slate-800 text-left bg-slate-800 dark:bg-slate-900 sticky left-[120px] z-10">DK (RM)</td>
                                        {SCHEMES.map(s => (
                                            <td key={`total_dk_${s.key}`} className="px-2 py-2 border-r border-slate-700 dark:border-slate-800 text-right bg-slate-800 dark:bg-slate-900 text-slate-400">
                                                {formatMoney(grandTotals.schemes[s.key]?.dk || 0)}
                                            </td>
                                        ))}
                                        <td className="px-2 py-2 text-right bg-slate-900 dark:bg-black text-slate-400 border-l border-slate-700 dark:border-slate-800">{formatMoney(grandTotals.grandDK)}</td>
                                    </tr>
                                    <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold">
                                        <td className="px-3 py-2 border-r border-slate-700 dark:border-slate-800 text-left bg-slate-800 dark:bg-slate-900 sticky left-[120px] z-10">%</td>
                                        {SCHEMES.map(s => {
                                            const p = formatPercent(grandTotals.schemes[s.key]?.pk || 0, grandTotals.schemes[s.key]?.dk || 0);
                                            return (
                                                <td key={`total_pct_${s.key}`} className={`px-2 py-2 border-r border-slate-700 dark:border-slate-800 text-right bg-slate-800 dark:bg-slate-900 ${parseFloat(p) >= 100 ? 'text-emerald-400' : 'text-white'}`}>
                                                    {p}%
                                                </td>
                                            )
                                        })}
                                        <td className="px-2 py-2 text-right bg-slate-900 dark:bg-black text-white border-l border-slate-700 dark:border-slate-800">
                                            {formatPercent(grandTotals.grandPK, grandTotals.grandDK)}%
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const EditCell = ({ edit, val, onChange, onBlur }: { edit: boolean, val: number, onChange: (v: string) => void, onBlur?: () => void }) => {
    const [local, setLocal] = useState<string | null>(null);

    if (edit) {
        return (
            <input 
                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-1 py-1 rounded text-xs focus:ring-1 focus:ring-brand-500 outline-none text-right"
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
    return <div className="text-right">{val.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>;
}

const SortHeader = ({ label, sortKey, sortConfig, onSort, rowSpan, colSpan, className }: { label: React.ReactNode, sortKey: string, sortConfig: SortConfig, onSort: (key: string) => void, rowSpan?: number, colSpan?: number, className?: string }) => {
    const isActive = sortConfig?.key === sortKey;
    return (
        <th 
            rowSpan={rowSpan} 
            colSpan={colSpan}
            className={`px-4 py-2 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none group ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center gap-1">
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


export default CollectionReport;
