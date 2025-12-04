
import React, { useState, useEffect, useMemo } from 'react';
import { FinancingReportFullData, MonthlyPerformanceRow, BranchPerformanceRow, RankingItem, UnprocessedBranch } from '../types';
import { useYear, useSearch } from './Layout';
import { useAuth } from '../contexts/AuthContext';
import AISummary from './AISummary';
import { api } from '../services/api'; // Import API Service
import { 
    ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
    Save, Plus, RefreshCw, TrendingUp, Trash2, Edit2, Cloud, Download, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// --- MOCK INITIAL DATA ---

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

const INITIAL_MONTHLY_DATA: MonthlyPerformanceRow[] = MONTHS.map((m, i) => ({
    id: `m_${i}`,
    month: m,
    targetBil: 1550,
    actualBil: [1132, 2004, 2696, 215, 1449, 1333, 1808, 1869, 1350, 2321, 0, 0][i] || 0,
    targetRM: 12916666.67,
    actualRM: [10610000, 17737000, 23399000, 1741000, 12389000, 10800000, 14783000, 14963000, 10810000, 19502000, 0, 0][i] || 0
}));

const INITIAL_BRANCH_DATA: BranchPerformanceRow[] = [
    { id: 'b1', negeri: 'JOHOR', bilPeminjam: 1647, bilPembiayaan: 1696, nilaiRM: 14448000, targetBil: 2168, targetRM: 18478000 },
    { id: 'b2', negeri: 'KEDAH', bilPeminjam: 1252, bilPembiayaan: 1321, nilaiRM: 12887000, targetBil: 1661, targetRM: 14157000 },
    { id: 'b3', negeri: 'KELANTAN', bilPeminjam: 1563, bilPembiayaan: 1635, nilaiRM: 17026000, targetBil: 1352, targetRM: 11523000 },
    { id: 'b4', negeri: 'MELAKA', bilPeminjam: 384, bilPembiayaan: 406, nilaiRM: 3436000, targetBil: 507, targetRM: 4320000 },
    { id: 'b5', negeri: 'N.SEMBILAN', bilPeminjam: 669, bilPembiayaan: 717, nilaiRM: 7115000, targetBil: 732, targetRM: 6238000 },
    { id: 'b6', negeri: 'PAHANG', bilPeminjam: 1048, bilPembiayaan: 1083, nilaiRM: 10639000, targetBil: 1267, targetRM: 10798000 },
    { id: 'b7', negeri: 'PERAK', bilPeminjam: 623, bilPembiayaan: 656, nilaiRM: 5879000, targetBil: 1211, targetRM: 10320000 },
    { id: 'b8', negeri: 'PERLIS', bilPeminjam: 320, bilPembiayaan: 323, nilaiRM: 3621000, targetBil: 310, targetRM: 2642000 },
    { id: 'b9', negeri: 'PULAU PINANG', bilPeminjam: 484, bilPembiayaan: 498, nilaiRM: 5270000, targetBil: 648, targetRM: 5523000 },
    { id: 'b10', negeri: 'SABAH', bilPeminjam: 3164, bilPembiayaan: 3253, nilaiRM: 20451000, targetBil: 2781, targetRM: 21940000 },
    { id: 'b11', negeri: 'SARAWAK', bilPeminjam: 1678, bilPembiayaan: 1715, nilaiRM: 11599000, targetBil: 2161, targetRM: 16657000 },
    { id: 'b12', negeri: 'SELANGOR', bilPeminjam: 1513, bilPembiayaan: 1556, nilaiRM: 13539000, targetBil: 2140, targetRM: 18238000 },
    { id: 'b13', negeri: 'TERENGGANU', bilPeminjam: 603, bilPembiayaan: 621, nilaiRM: 4376000, targetBil: 1070, targetRM: 9120000 },
    { id: 'b14', negeri: 'WPKL', bilPeminjam: 639, bilPembiayaan: 695, nilaiRM: 6459000, targetBil: 592, targetRM: 5046000 },
];

const INITIAL_RANKING_TOP_BIL: RankingItem[] = [
    { id: 'r1', name: 'KOTA SAMARAHAN', value: 452 },
    { id: 'r2', name: 'KENINGAU', value: 395 },
    { id: 'r3', name: 'KOTA MARUDU', value: 280 },
    { id: 'r4', name: 'SANDAKAN', value: 272 },
    { id: 'r5', name: 'MIRI', value: 251 },
];

const INITIAL_RANKING_TOP_RM: RankingItem[] = [
    { id: 'r1', name: 'KOTA SAMARAHAN', value: 3674000 },
    { id: 'r2', name: 'KUBANG KERIAN', value: 3071000 },
    { id: 'r3', name: 'KENINGAU', value: 2410000 },
    { id: 'r4', name: 'PENGKALAN CHEPA', value: 2341000 },
    { id: 'r5', name: 'WANGSA MAJU', value: 2233000 },
];

const INITIAL_UNPROCESSED: UnprocessedBranch[] = [
    { id: 'u1', negeri: 'PERAK', cawangan: 'BAGAN DATOK' },
    { id: 'u2', negeri: 'SELANGOR', cawangan: 'SUBANG' }
];

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const FinancingReport: React.FC = () => {
    const { selectedYear } = useYear();
    const { searchQuery } = useSearch();
    const { user } = useAuth();
    const [data, setData] = useState<FinancingReportFullData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    
    // Sort States
    const [monthlySort, setMonthlySort] = useState<SortConfig>(null);
    const [branchSort, setBranchSort] = useState<SortConfig>(null);

    useEffect(() => {
        const loadData = async () => {
            const savedData = await api.getData('financing', selectedYear);
            if (savedData) {
                setData(savedData);
            } else {
                // Initialize default data
                setData({
                    year: selectedYear,
                    monthlyPerformance: INITIAL_MONTHLY_DATA,
                    branchPerformance: INITIAL_BRANCH_DATA,
                    topRankingBil: INITIAL_RANKING_TOP_BIL,
                    topRankingRM: INITIAL_RANKING_TOP_RM,
                    bottomRankingBil: Array(5).fill(null).map((_, i) => ({ id: `br_${i}`, name: '', value: 0 })),
                    bottomRankingRM: Array(5).fill(null).map((_, i) => ({ id: `brrm_${i}`, name: '', value: 0 })),
                    unprocessedBranches: INITIAL_UNPROCESSED,
                    unprocessedDate: new Date().toLocaleDateString('en-GB')
                });
            }
        };
        loadData();
    }, [selectedYear]);

    // Auto Save
    const triggerAutoSave = async () => {
        if (!data) return;
        setSaveStatus('saving');
        await api.saveData('financing', selectedYear, data);
        setSaveStatus('saved');
        
        if (user?.email) {
            api.logActivity(user.email, 'UPDATE_FINANCING_REPORT', `Updated financing report for ${selectedYear}`);
        }

        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleSave = async () => {
        await triggerAutoSave();
        setIsEditing(false);
    };

    const formatNumber = (num: number, isCurrency = false) => {
        if (num === 0) return '-';
        if (isCurrency) return num.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        return num.toLocaleString('en-MY');
    };

    const calcPercent = (actual: number, target: number) => {
        if (!target) return 0;
        return (actual / target) * 100;
    };

    // Generic Updater
    const updateRow = (section: keyof FinancingReportFullData, id: string, field: string, val: string) => {
        if (!data) return;
        const list = data[section] as any[];
        const numVal = parseFloat(val.replace(/,/g, '')) || 0;
        const finalVal = ['negeri', 'cawangan', 'month', 'name'].includes(field) ? val : numVal;

        const updatedList = list.map(item => item.id === id ? { ...item, [field]: finalVal } : item);
        setData({ ...data, [section]: updatedList });
    };

    const addRow = (section: keyof FinancingReportFullData) => {
        if (!data) return;
        const list = data[section] as any[];
        const newId = `${section}_${Date.now()}`;
        
        let newItem: any = {};
        if (section === 'unprocessedBranches') newItem = { id: newId, negeri: '', cawangan: '' };
        else if (section === 'branchPerformance') newItem = { id: newId, negeri: 'NEGERI BARU', bilPeminjam: 0, bilPembiayaan: 0, nilaiRM: 0, targetBil: 0, targetRM: 0 };
        else return;

        setData({ ...data, [section]: [...list, newItem] });
    };

    const deleteRow = (section: keyof FinancingReportFullData, id: string) => {
        if (!data) return;
        const list = data[section] as any[];
        setData({ ...data, [section]: list.filter(item => item.id !== id) });
    };

    // Sorting Helper
    const sortData = (data: any[], config: SortConfig) => {
        if (!config) return data;
        return [...data].sort((a, b) => {
            const valA = a[config.key];
            const valB = b[config.key];
            if (typeof valA === 'string' && typeof valB === 'string') {
                return config.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return config.direction === 'asc' ? valA - valB : valB - valA;
        });
    }

    const handleMonthlySort = (key: string) => {
        setMonthlySort(prev => prev?.key === key && prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' });
    }

    const handleBranchSort = (key: string) => {
        setBranchSort(prev => prev?.key === key && prev.direction === 'asc' ? { key, direction: 'desc' } : { key, direction: 'asc' });
    }

    // Filter & Sort Functions with Memoization
    const filteredMonthly = useMemo(() => {
        const list = data?.monthlyPerformance.filter(r => r.month.toLowerCase().includes(searchQuery.toLowerCase())) || [];
        return sortData(list, monthlySort);
    }, [data, searchQuery, monthlySort]);

    const filteredBranch = useMemo(() => {
        const list = data?.branchPerformance.filter(r => r.negeri.toLowerCase().includes(searchQuery.toLowerCase())) || [];
        return sortData(list, branchSort);
    }, [data, searchQuery, branchSort]);
    
    const filteredUnprocessed = useMemo(() => 
        data?.unprocessedBranches.filter(r => 
            r.negeri.toLowerCase().includes(searchQuery.toLowerCase()) || 
            r.cawangan.toLowerCase().includes(searchQuery.toLowerCase())
        ) || [],
        [data, searchQuery]
    );

    // Totals for Tables with Memoization
    const totalMonthly = useMemo(() => {
        if (!data) return { targetBil: 0, actualBil: 0, targetRM: 0, actualRM: 0 };
        return data.monthlyPerformance.reduce((acc, curr) => ({
            targetBil: acc.targetBil + curr.targetBil,
            actualBil: acc.actualBil + curr.actualBil,
            targetRM: acc.targetRM + curr.targetRM,
            actualRM: acc.actualRM + curr.actualRM
        }), { targetBil: 0, actualBil: 0, targetRM: 0, actualRM: 0 });
    }, [data]);

    const totalBranch = useMemo(() => {
        if (!data) return { bilPeminjam: 0, bilPembiayaan: 0, nilaiRM: 0, targetBil: 0, targetRM: 0 };
        return data.branchPerformance.reduce((acc, curr) => ({
            bilPeminjam: acc.bilPeminjam + curr.bilPeminjam,
            bilPembiayaan: acc.bilPembiayaan + curr.bilPembiayaan,
            nilaiRM: acc.nilaiRM + curr.nilaiRM,
            targetBil: acc.targetBil + curr.targetBil,
            targetRM: acc.targetRM + curr.targetRM
        }), { bilPeminjam: 0, bilPembiayaan: 0, nilaiRM: 0, targetBil: 0, targetRM: 0 });
    }, [data]);

    // Export Logic
    const exportBranchData = () => {
        if (!data) return;
        const headers = ['Negeri', 'Bil Peminjam', 'Bil Pembiayaan', 'Nilai (RM)', 'Sasaran Bil', 'Sasaran RM'];
        const rows = data.branchPerformance.map(r => [r.negeri, r.bilPeminjam, r.bilPembiayaan, r.nilaiRM, r.targetBil, r.targetRM]);
        api.exportTableToCSV(`Prestasi_Cawangan_${selectedYear}`, headers, rows);
    }

    if (!data) return <div className="p-10 text-center text-slate-500 font-medium animate-pulse flex flex-col items-center gap-2"><RefreshCw className="animate-spin text-brand-600"/> Memuatkan Data...</div>;

    return (
        <div className="space-y-8 max-w-[1800px] mx-auto pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                     <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/30">
                        <TrendingUp size={24} /> 
                     </div>
                     Laporan Prestasi Pembiayaan {selectedYear}
                   </h2>
                   <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-14">Analisa sasaran dan pencapaian sebenar pembiayaan nasional.</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <AISummary context="Laporan Prestasi Pembiayaan" data={data} />
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

            {/* CHART SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-6">
                        <h3 className="font-bold text-slate-800 dark:text-white">Prestasi Bulanan: Sasaran vs Pencapaian (RM)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Perbandingan jumlah pembiayaan yang disasarkan dan yang dicapai.</p>
                    </div>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.monthlyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-700" />
                                <XAxis dataKey="month" tick={{fontSize: 10, fill: '#64748b'}} />
                                <YAxis tickFormatter={(val) => `RM${val/1000000}m`} tick={{fontSize: 10, fill: '#64748b'}} width={60} />
                                <Tooltip 
                                    formatter={(val: number) => `RM ${val.toLocaleString()}`} 
                                    contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#f8fafc', borderRadius: '8px'}}
                                />
                                <Legend />
                                <Bar dataKey="actualRM" name="Pencapaian (RM)" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={24} />
                                <Line type="monotone" dataKey="targetRM" name="Sasaran (RM)" stroke="#f59e0b" strokeWidth={2} dot={{r:3}} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                
                {/* Summary Card */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 dark:from-indigo-950 dark:to-slate-950 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full blur-3xl -mr-10 -mt-10"></div>
                    <div>
                        <p className="text-indigo-200 font-medium text-sm">Pencapaian Keseluruhan {selectedYear}</p>
                        <h3 className="text-3xl font-bold mt-2">RM {formatNumber(totalMonthly.actualRM)}</h3>
                        <div className="mt-4 flex gap-3">
                            <span className={`px-2 py-1 rounded-lg text-xs font-bold ${calcPercent(totalMonthly.actualRM, totalMonthly.targetRM) >= 100 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                                {calcPercent(totalMonthly.actualRM, totalMonthly.targetRM).toFixed(1)}%
                            </span>
                            <span className="text-xs text-indigo-300 flex items-center">daripada sasaran</span>
                        </div>
                    </div>
                    <div className="space-y-4 mt-8">
                        <div className="flex justify-between border-b border-indigo-700/50 pb-2">
                            <span className="text-sm text-indigo-300">Bilangan Pembiayaan</span>
                            <span className="font-bold">{formatNumber(totalMonthly.actualBil)}</span>
                        </div>
                        <div className="flex justify-between border-b border-indigo-700/50 pb-2">
                            <span className="text-sm text-indigo-300">Baki Sasaran</span>
                            <span className="font-bold text-amber-400">RM {formatNumber(Math.max(0, totalMonthly.targetRM - totalMonthly.actualRM))}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABLE 1: PRESTASI BULANAN */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-b border-slate-200 dark:border-slate-600">
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-sm">Laporan Prestasi Pembiayaan {selectedYear} (Bulanan)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center">
                        <thead className="bg-slate-100 dark:bg-slate-700/30 font-bold uppercase text-slate-500 dark:text-slate-400">
                            <tr>
                                <SortHeader label="Bulan" sortKey="month" sortConfig={monthlySort} onSort={handleMonthlySort} rowSpan={2} className="w-32 text-left" />
                                <th rowSpan={2} className="px-2 w-10 border-r border-slate-200 dark:border-slate-700/50">#</th>
                                <th colSpan={3} className="px-4 py-2 border-r border-slate-200 dark:border-slate-700/50 bg-blue-50/50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Bilangan</th>
                                <th rowSpan={2} className="px-2 w-10 border-r border-slate-200 dark:border-slate-700/50">#</th>
                                <th colSpan={3} className="px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">Jumlah (RM)</th>
                            </tr>
                            <tr>
                                <SortHeader label="Sasaran" sortKey="targetBil" sortConfig={monthlySort} onSort={handleMonthlySort} className="bg-blue-50/30 dark:bg-blue-900/10 w-32" />
                                <SortHeader label="Pencapaian" sortKey="actualBil" sortConfig={monthlySort} onSort={handleMonthlySort} className="bg-blue-50/30 dark:bg-blue-900/10 w-32" />
                                <th className="px-2 py-2 bg-blue-50/30 dark:bg-blue-900/10 border-r border-slate-200 dark:border-slate-700/50 w-16 text-blue-600 dark:text-blue-400">%</th>
                                <SortHeader label="Sasaran" sortKey="targetRM" sortConfig={monthlySort} onSort={handleMonthlySort} className="bg-indigo-50/30 dark:bg-indigo-900/10 w-40" />
                                <SortHeader label="Pencapaian" sortKey="actualRM" sortConfig={monthlySort} onSort={handleMonthlySort} className="bg-indigo-50/30 dark:bg-indigo-900/10 w-40" />
                                <th className="px-2 py-2 bg-indigo-50/30 dark:bg-indigo-900/10 w-16 text-indigo-600 dark:text-indigo-400">%</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredMonthly.map((row, i) => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50">{row.month}</td>
                                    <td className="px-2 text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-700/50">{i + 1}</td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50"><EditCell edit={isEditing} val={row.targetBil} onChange={v => updateRow('monthlyPerformance', row.id, 'targetBil', v)} onBlur={triggerAutoSave} /></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 font-semibold"><EditCell edit={isEditing} val={row.actualBil} onChange={v => updateRow('monthlyPerformance', row.id, 'actualBil', v)} onBlur={triggerAutoSave} /></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 font-bold text-blue-600 dark:text-blue-400">{calcPercent(row.actualBil, row.targetBil).toFixed(2)}</td>
                                    
                                    <td className="px-2 text-slate-400 dark:text-slate-500 border-r border-slate-100 dark:border-slate-700/50">{i + 1}</td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50"><EditCell edit={isEditing} val={row.targetRM} isCurrency onChange={v => updateRow('monthlyPerformance', row.id, 'targetRM', v)} onBlur={triggerAutoSave} /></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 font-semibold"><EditCell edit={isEditing} val={row.actualRM} isCurrency onChange={v => updateRow('monthlyPerformance', row.id, 'actualRM', v)} onBlur={triggerAutoSave} /></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 font-bold text-indigo-600 dark:text-indigo-400">{calcPercent(row.actualRM, row.targetRM).toFixed(2)}</td>
                                </tr>
                            ))}
                             {/* SHOW TOTALS ONLY IF NOT SEARCHING */}
                            {!searchQuery && (
                                <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold">
                                    <td className="px-4 py-3 text-left border-r border-slate-700">JUMLAH</td>
                                    <td className="px-2 border-r border-slate-700"></td>
                                    <td className="px-2 border-r border-slate-700">{formatNumber(totalMonthly.targetBil)}</td>
                                    <td className="px-2 border-r border-slate-700 text-brand-300">{formatNumber(totalMonthly.actualBil)}</td>
                                    <td className="px-2 border-r border-slate-700">{calcPercent(totalMonthly.actualBil, totalMonthly.targetBil).toFixed(2)}</td>
                                    <td className="px-2 border-r border-slate-700"></td>
                                    <td className="px-2 border-r border-slate-700">{formatNumber(totalMonthly.targetRM, true)}</td>
                                    <td className="px-2 border-r border-slate-700 text-brand-300">{formatNumber(totalMonthly.actualRM, true)}</td>
                                    <td className="px-2">{calcPercent(totalMonthly.actualRM, totalMonthly.targetRM).toFixed(2)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* TABLE 2: PRESTASI CAWANGAN (UPDATED: Light Headers) */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-700/50 px-6 py-4 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-sm">Laporan Prestasi Mengikut Negeri & Cawangan</h3>
                    <div className="flex gap-2">
                         <button onClick={exportBranchData} className="flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-3 py-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 transition">
                            <Download size={12}/> CSV
                        </button>
                        {isEditing && (
                            <button onClick={() => addRow('branchPerformance')} className="flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 px-3 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-600 transition dark:text-white">
                                <Plus size={12}/> Tambah Negeri
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-center">
                        <thead className="bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 font-bold uppercase">
                            <tr>
                                <SortHeader label="Negeri" sortKey="negeri" sortConfig={branchSort} onSort={handleBranchSort} rowSpan={2} className="w-48 text-left" />
                                <th colSpan={3} className="px-4 py-2 border-r border-slate-200 dark:border-slate-700/50 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">Pembiayaan</th>
                                <th colSpan={2} className="px-4 py-2 border-r border-slate-200 dark:border-slate-700/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400">Sasaran</th>
                                <th colSpan={2} className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">Prestasi {selectedYear} (%)</th>
                                {isEditing && <th rowSpan={2} className="w-10 bg-red-50 dark:bg-red-900/20"></th>}
                            </tr>
                            <tr>
                                <SortHeader label="Bil Peminjam" sortKey="bilPeminjam" sortConfig={branchSort} onSort={handleBranchSort} className="bg-blue-50/50 dark:bg-blue-900/10 w-24" />
                                <SortHeader label="Bil Pembiayaan" sortKey="bilPembiayaan" sortConfig={branchSort} onSort={handleBranchSort} className="bg-blue-50/50 dark:bg-blue-900/10 w-24" />
                                <SortHeader label="Nilai (RM)" sortKey="nilaiRM" sortConfig={branchSort} onSort={handleBranchSort} className="bg-blue-50/50 dark:bg-blue-900/10 w-32" />
                                <SortHeader label="Bil Pembiayaan" sortKey="targetBil" sortConfig={branchSort} onSort={handleBranchSort} className="bg-indigo-50/50 dark:bg-indigo-900/10 w-24" />
                                <SortHeader label="Nilai (RM)" sortKey="targetRM" sortConfig={branchSort} onSort={handleBranchSort} className="bg-indigo-50/50 dark:bg-indigo-900/10 w-32" />
                                <th className="px-2 py-2 bg-emerald-50/50 dark:bg-emerald-900/10 border-r border-slate-200 dark:border-slate-700/50 w-16">Bil</th>
                                <th className="px-2 py-2 bg-emerald-50/50 dark:bg-emerald-900/10 w-16">Nilai</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredBranch.map((row) => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3 text-left font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50">
                                        <EditCell edit={isEditing} val={row.negeri} onChange={v => updateRow('branchPerformance', row.id, 'negeri', v)} onBlur={triggerAutoSave} align="left"/>
                                    </td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400"><EditCell edit={isEditing} val={row.bilPeminjam} onChange={v => updateRow('branchPerformance', row.id, 'bilPeminjam', v)} onBlur={triggerAutoSave}/></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400"><EditCell edit={isEditing} val={row.bilPembiayaan} onChange={v => updateRow('branchPerformance', row.id, 'bilPembiayaan', v)} onBlur={triggerAutoSave}/></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 text-slate-600 dark:text-slate-400"><EditCell edit={isEditing} val={row.nilaiRM} isCurrency onChange={v => updateRow('branchPerformance', row.id, 'nilaiRM', v)} onBlur={triggerAutoSave}/></td>
                                    
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-700/20 text-slate-500 dark:text-slate-500"><EditCell edit={isEditing} val={row.targetBil} onChange={v => updateRow('branchPerformance', row.id, 'targetBil', v)} onBlur={triggerAutoSave}/></td>
                                    <td className="px-2 border-r border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-700/20 text-slate-500 dark:text-slate-500"><EditCell edit={isEditing} val={row.targetRM} isCurrency onChange={v => updateRow('branchPerformance', row.id, 'targetRM', v)} onBlur={triggerAutoSave}/></td>
                                    
                                    <td className={`px-2 font-bold border-r border-slate-100 dark:border-slate-700/50 ${calcPercent(row.bilPembiayaan, row.targetBil) < 80 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {calcPercent(row.bilPembiayaan, row.targetBil).toFixed(0)}%
                                    </td>
                                    <td className={`px-2 font-bold ${calcPercent(row.nilaiRM, row.targetRM) < 80 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                        {calcPercent(row.nilaiRM, row.targetRM).toFixed(0)}%
                                    </td>
                                    {isEditing && (
                                        <td className="text-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => deleteRow('branchPerformance', row.id)}>
                                            <Trash2 size={14} className="mx-auto text-red-400 hover:text-red-600"/>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {!searchQuery && (
                                <tr className="bg-slate-800 dark:bg-slate-900 text-white font-bold">
                                    <td className="px-4 py-3 text-left border-r border-slate-700">JUMLAH</td>
                                    <td className="px-2 border-r border-slate-700">{formatNumber(totalBranch.bilPeminjam)}</td>
                                    <td className="px-2 border-r border-slate-700">{formatNumber(totalBranch.bilPembiayaan)}</td>
                                    <td className="px-2 border-r border-slate-700 text-brand-300">{formatNumber(totalBranch.nilaiRM, true)}</td>
                                    <td className="px-2 border-r border-slate-700">{formatNumber(totalBranch.targetBil)}</td>
                                    <td className="px-2 border-r border-slate-700">{formatNumber(totalBranch.targetRM, true)}</td>
                                    <td className="px-2 border-r border-slate-700">{calcPercent(totalBranch.bilPembiayaan, totalBranch.targetBil).toFixed(0)}%</td>
                                    <td className="px-2">{calcPercent(totalBranch.nilaiRM, totalBranch.targetRM).toFixed(0)}%</td>
                                    {isEditing && <td></td>}
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* RANKING & UNPROCESSED SECTIONS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 {/* RANKING TABLES (UPDATED: Light Headers) */}
                 <div className="space-y-6">
                     <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                         <div className="bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-white px-4 py-3 text-xs font-bold uppercase tracking-wide border-b border-slate-200 dark:border-slate-600">
                             Laporan Ranking Keseluruhan Mengikut Cawangan {selectedYear}
                         </div>
                         <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700">
                             {/* Top Ranking */}
                             <div>
                                 <div className="bg-slate-50 dark:bg-slate-700/30 px-3 py-2 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Top Ranking (Bil)</div>
                                 <table className="w-full text-xs">
                                     <tbody>
                                         {data.topRankingBil.map((item, i) => (
                                             <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                 <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{i+1}. <EditCell edit={isEditing} val={item.name} align="left" onChange={v => updateRow('topRankingBil', item.id, 'name', v)} onBlur={triggerAutoSave} /></td>
                                                 <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-200"><EditCell edit={isEditing} val={item.value} align="right" onChange={v => updateRow('topRankingBil', item.id, 'value', v)} onBlur={triggerAutoSave} /></td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                             <div>
                                 <div className="bg-slate-50 dark:bg-slate-700/30 px-3 py-2 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">Top Ranking (RM)</div>
                                 <table className="w-full text-xs">
                                     <tbody>
                                         {data.topRankingRM.map((item, i) => (
                                             <tr key={item.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                                 <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{i+1}. <EditCell edit={isEditing} val={item.name} align="left" onChange={v => updateRow('topRankingRM', item.id, 'name', v)} onBlur={triggerAutoSave} /></td>
                                                 <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-200"><EditCell edit={isEditing} val={item.value} isCurrency align="right" onChange={v => updateRow('topRankingRM', item.id, 'value', v)} onBlur={triggerAutoSave} /></td>
                                             </tr>
                                         ))}
                                     </tbody>
                                 </table>
                             </div>
                         </div>
                     </div>
                 </div>

                 {/* UNPROCESSED TABLE (UPDATED: White Backgrounds) */}
                 <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-fit">
                    <div className="bg-slate-50 dark:bg-slate-700/50 px-5 py-4 border-b border-slate-200 dark:border-slate-600 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white uppercase tracking-wide text-xs">Cawangan Belum Proses Permohonan</h3>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Data Sehingga: {data.unprocessedDate}</p>
                        </div>
                        {isEditing && (
                            <button onClick={() => addRow('unprocessedBranches')} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-400">
                                <Plus size={14}/>
                            </button>
                        )}
                    </div>
                    <table className="w-full text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700 uppercase">
                            <tr>
                                <th className="px-4 py-2 w-10">Bil</th>
                                <th className="px-4 py-2 text-left">Negeri</th>
                                <th className="px-4 py-2 text-left">Cawangan</th>
                                {isEditing && <th className="w-8"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                            {filteredUnprocessed.map((row, i) => (
                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                    <td className="px-4 py-3 text-center text-slate-400 dark:text-slate-500">{i+1}</td>
                                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                                        <EditCell edit={isEditing} val={row.negeri} align="left" onChange={v => updateRow('unprocessedBranches', row.id, 'negeri', v)} onBlur={triggerAutoSave} />
                                    </td>
                                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                                        <EditCell edit={isEditing} val={row.cawangan} align="left" onChange={v => updateRow('unprocessedBranches', row.id, 'cawangan', v)} onBlur={triggerAutoSave} />
                                    </td>
                                    {isEditing && (
                                        <td className="text-center cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => deleteRow('unprocessedBranches', row.id)}>
                                            <Trash2 size={12} className="mx-auto text-red-400"/>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {filteredUnprocessed.length === 0 && (
                                <tr><td colSpan={4} className="p-4 text-center text-slate-400 italic">Tiada cawangan dijumpai.</td></tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

// Reusable Sort Header
const SortHeader = ({ label, sortKey, sortConfig, onSort, rowSpan, colSpan, className }: { label: React.ReactNode, sortKey: string, sortConfig: SortConfig, onSort: (key: string) => void, rowSpan?: number, colSpan?: number, className?: string }) => {
    const isActive = sortConfig?.key === sortKey;
    return (
        <th 
            rowSpan={rowSpan} 
            colSpan={colSpan}
            className={`px-4 py-2 border-r border-slate-200 dark:border-slate-700/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors select-none group ${className}`}
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

const EditCell = ({ edit, val, isCurrency, onChange, onBlur, align = 'center' }: { edit: boolean, val: number | string, isCurrency?: boolean, onChange: (v: string) => void, onBlur?: () => void, align?: 'left'|'center'|'right' }) => {
    const [local, setLocal] = useState<string | null>(null);

    if (edit) {
        return (
            <input 
                className={`w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 px-2 py-1.5 rounded text-xs focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none text-${align}`}
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
    const display = typeof val === 'number' ? (isCurrency ? val.toLocaleString('en-MY', {minimumFractionDigits: 2}) : val.toLocaleString('en-MY')) : val;
    return <div className={`text-${align}`}>{display}</div>;
}

export default FinancingReport;
