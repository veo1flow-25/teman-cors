
import React, { useState, useEffect, useMemo } from 'react';
import { DailyReportData, SchemeRow, SideTableRow, ReportMetrics } from '../types';
import AISummary from './AISummary';
import { useYear, useSearch } from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { 
  Calendar, Save, RefreshCw, FileSpreadsheet, 
  Printer, Plus, Trash2, LayoutList, CheckCircle2, AlertTriangle, Wallet, Download, Cloud, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';

// --- INITIAL DATA CONSTANTS ---

const SCHEMES_MAIN = [
  'TEMAN TEKUN',
  'TEMANNITA',
  'TEMAN 2.0',
  'TEMANNITA 2.0',
  'TEMAN PLUS'
];

const SCHEMES_SPECIAL = [
  'SPIN',
  'SPUT'
];

const SIDE_TABLE_DATA = [
    { negeri: 'SABAH', bil: 866, amount: 4320000, percent: 172.8 },
    { negeri: 'SARAWAK', bil: 342, amount: 2029000, percent: 81.16 }
];

const DEFAULT_NOTES = [
  "TEMAN 2.0 - Tarikh Mula: 01 Jan 2018",
  "PLUS - Tarikh Mula: 15 Jan 2020",
  "SPIN - Tarikh Mula: 01 Nov 2020",
  "SPUT - Tarikh Mula: 01 Mac 2023",
  "Skim Pembiayaan: Mula pilih skim TEMAN 2.0 (PLUS - X) - 14.10.2024",
  "Formula: Pengeluaran Sahaja"
];

// Helper to create empty rows
const createMainRows = (prefix: string): SchemeRow[] => 
  SCHEMES_MAIN.map((name, i) => ({
    id: `${prefix}_${i}`,
    name,
    terimaBorang: { bil: 0, amount: 0 },
    kelulusan: { bil: 0, amount: 0 },
    pengeluaran: { bil: 0, amount: 0 },
  }));

const createSpecialRows = (prefix: string): SchemeRow[] => 
  SCHEMES_SPECIAL.map((name, i) => ({
    id: `${prefix}_${i}`,
    name,
    terimaBorang: { bil: 0, amount: 0 },
    kelulusan: { bil: 0, amount: 0 },
    pengeluaran: { bil: 0, amount: 0 }, // Unused for Special but kept for type consistency
  }));

// Helper to format number
const formatNumber = (val: number | string) => {
  if (val === '-' || val === '') return '-';
  const num = Number(val);
  return isNaN(num) ? '-' : num.toLocaleString('en-MY');
};

const formatDateDDMMYYYY = (isoDate: string) => {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    return d.toLocaleDateString('en-GB'); // dd/mm/yyyy
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

const DailyReport: React.FC = () => {
  const { selectedYear } = useYear();
  const { searchQuery } = useSearch();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportData, setReportData] = useState<DailyReportData | null>(null);
  const [activeTab, setActiveTab] = useState<'harian' | 'kumulatifYear' | 'kumulatifLegacy'>('harian');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Default Headers Generator
  const getDefaultHeaders = (date: string, year: number) => {
    const formattedDate = formatDateDDMMYYYY(date);
    return {
      t10_title: "Laporan Harian Prestasi Pembiayaan",
      t10_subtitle: `Pada ${formattedDate}`,
      t10_main: "Pembiayaan", t10_c1: "Terima Borang", t10_c2: "Kelulusan", t10_c3: "Pengeluaran (Cek / EFT)",

      t11_title: "Laporan Harian Skim Khas (SPIN / SPUT)",
      t11_subtitle: `Pada ${formattedDate}`,
      t11_main: "Pembiayaan", t11_c1: "Terima Borang", t11_c2: "Kelulusan", t11_c3: "",

      t12_title: "Laporan Prestasi Pembiayaan (Bulanan)",
      t12_subtitle: `01 hingga ${formattedDate}`,
      t12_main: "Pembiayaan", t12_c1: "Terima Borang", t12_c2: "Kelulusan", t12_c3: "Pengeluaran (Cek / EFT)",

      t13_title: "Laporan Skim Khas (Bulanan)",
      t13_subtitle: `01 hingga ${formattedDate}`,
      t13_main: "Pembiayaan", t13_c1: "Terima Borang", t13_c2: "Kelulusan", t13_c3: "",

      t14_title: `Laporan Harian Pembiayaan Kumulatif ${year}`,
      t14_subtitle: `Sehingga ${formattedDate}`,
      t14_main: "Pembiayaan", t14_c1: "Terima Borang", t14_c2: "Kelulusan", t14_c3: "Pengeluaran (Cek / EFT)",

      t15_title: `Laporan Skim Khas Kumulatif ${year}`,
      t15_subtitle: `Sehingga ${formattedDate}`,
      t15_main: "Pembiayaan", t15_c1: "Terima Borang", t15_c2: "Kelulusan", t15_c3: "",

      t16_title: "Laporan Harian Pembiayaan Kumulatif (2015 - Kini)",
      t16_subtitle: `Sehingga ${formattedDate}`,
      t16_main: "Pembiayaan", t16_c1: "Terima Borang", t16_c2: "Kelulusan", t16_c3: "Pengeluaran (Cek / EFT)",

      t17_title: "Laporan Skim Khas Kumulatif (2015 - Kini)",
      t17_subtitle: `Sehingga ${formattedDate}`,
      t17_main: "Pembiayaan", t17_c1: "Terima Borang", t17_c2: "Kelulusan", t17_c3: "",
    };
  };

  // Load / Init Data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      // Fetch data using API Service (Cloud -> Local Fallback)
      const data = await api.getData('daily', selectedYear, selectedDate);

      if (data) {
        // Ensure headers exist if migrating from old data
        if (!data.headers) {
          data.headers = getDefaultHeaders(selectedDate, selectedYear);
        }
        setReportData(data);
      } else {
        // Initialize Default Data if none found
        setReportData({
          date: selectedDate,
          notes: DEFAULT_NOTES,
          headers: getDefaultHeaders(selectedDate, selectedYear),
          table10: createMainRows('t10'),
          table11: createSpecialRows('t11'),
          table12: createMainRows('t12'),
          table13: createSpecialRows('t13'),
          table14: createMainRows('t14'),
          table15: createSpecialRows('t15'),
          table15Side: SIDE_TABLE_DATA,
          table16: createMainRows('t16'),
          table17: createSpecialRows('t17'),
        });
      }
      setIsLoading(false);
    };
    loadData();
  }, [selectedDate, selectedYear]);

  // AUTO SAVE FUNCTION
  const triggerAutoSave = async () => {
      if (!reportData) return;
      setSaveStatus('saving');
      await api.saveData('daily', selectedYear, reportData, selectedDate);
      setSaveStatus('saved');
      
      // Log activity
      if (user?.email) {
          api.logActivity(user.email, 'UPDATE_DAILY_REPORT', `Updated daily report for ${selectedDate}`);
      }

      setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const updateTableData = (tableKey: keyof DailyReportData, rowId: string, cat: string, field: string, val: string) => {
    if (!reportData) return;
    const numValue = val === '' ? 0 : parseFloat(val.replace(/,/g, ''));
    
    if (Array.isArray(reportData[tableKey])) {
        // @ts-ignore
        const newData = (reportData[tableKey] as SchemeRow[]).map(row => {
            if (row.id === rowId) {
                return {
                    ...row,
                    [cat]: {
                        // @ts-ignore
                        ...row[cat],
                        [field]: isNaN(numValue) ? 0 : numValue
                    }
                }
            }
            return row;
        });
        setReportData({ ...reportData, [tableKey]: newData });
    }
  };

  const updateHeader = (key: string, value: string) => {
    if (!reportData) return;
    setReportData({
      ...reportData,
      headers: { ...reportData.headers, [key]: value }
    });
  };

  const handleAddNote = () => {
    if (!reportData) return;
    const newNotes = [...reportData.notes, "Nota baru..."];
    setReportData({ ...reportData, notes: newNotes });
  };

  const handleUpdateNote = (index: number, value: string) => {
    if (!reportData) return;
    const newNotes = [...reportData.notes];
    newNotes[index] = value;
    setReportData({ ...reportData, notes: newNotes });
  };

  const handleDeleteNote = (index: number) => {
    if (!reportData) return;
    const newNotes = reportData.notes.filter((_, i) => i !== index);
    setReportData({ ...reportData, notes: newNotes });
  };

  const calculateTotals = (rows: SchemeRow[]) => {
    return rows.reduce((acc, row) => ({
      terimaBorang: {
        bil: (Number(acc.terimaBorang.bil) || 0) + (Number(row.terimaBorang.bil) || 0),
        amount: (Number(acc.terimaBorang.amount) || 0) + (Number(row.terimaBorang.amount) || 0)
      },
      kelulusan: {
        bil: (Number(acc.kelulusan.bil) || 0) + (Number(row.kelulusan.bil) || 0),
        amount: (Number(acc.kelulusan.amount) || 0) + (Number(row.kelulusan.amount) || 0)
      },
      pengeluaran: {
        bil: (Number(acc.pengeluaran.bil) || 0) + (Number(row.pengeluaran.bil) || 0),
        amount: (Number(acc.pengeluaran.amount) || 0) + (Number(row.pengeluaran.amount) || 0)
      }
    }), {
      terimaBorang: { bil: 0, amount: 0 },
      kelulusan: { bil: 0, amount: 0 },
      pengeluaran: { bil: 0, amount: 0 }
    });
  };

  const getTableHeaders = (prefix: string) => {
      if (!reportData?.headers) return { title: '', subtitle: '', main: '', c1: '', c2: '', c3: '' };
      return {
          title: reportData.headers[`${prefix}_title`] || '',
          subtitle: reportData.headers[`${prefix}_subtitle`] || '',
          main: reportData.headers[`${prefix}_main`] || '',
          c1: reportData.headers[`${prefix}_c1`] || '',
          c2: reportData.headers[`${prefix}_c2`] || '',
          c3: reportData.headers[`${prefix}_c3`] || '',
      }
  }

  // Export Logic
  const handleExportCSV = (rows: SchemeRow[], headers: any) => {
    if (!reportData) return;
    const csvHeaders = ['Skim', 'Terima Borang (Bil)', 'Terima Borang (RM)', 'Kelulusan (Bil)', 'Kelulusan (RM)', 'Pengeluaran (Bil)', 'Pengeluaran (RM)'];
    const csvRows = rows.map(r => [
        r.name, 
        r.terimaBorang.bil, r.terimaBorang.amount,
        r.kelulusan.bil, r.kelulusan.amount,
        r.pengeluaran.bil, r.pengeluaran.amount
    ]);
    api.exportTableToCSV(headers.title || 'Laporan_Harian', csvHeaders, csvRows);
  }

  const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
          direction = 'desc';
      }
      setSortConfig({ key, direction });
  }

  // Generic sort function for SchemeRow
  const sortRows = (rows: SchemeRow[]) => {
      if (!sortConfig) return rows;
      
      return [...rows].sort((a, b) => {
          const getValue = (obj: any, path: string) => {
              return path.split('.').reduce((o, k) => (o || {})[k], obj);
          };

          const valA = getValue(a, sortConfig.key);
          const valB = getValue(b, sortConfig.key);

          if (typeof valA === 'number' && typeof valB === 'number') {
              return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
          } else {
              return sortConfig.direction === 'asc' 
                  ? String(valA).localeCompare(String(valB)) 
                  : String(valB).localeCompare(String(valA));
          }
      });
  };

  // Memoize Filtered & Sorted Rows
  const getProcessedRows = (rows: SchemeRow[]) => {
      let result = rows;
      if (searchQuery) {
          result = result.filter(row => row.name.toLowerCase().includes(searchQuery.toLowerCase()));
      }
      return sortRows(result);
  };

  const filteredTable10 = useMemo(() => reportData ? getProcessedRows(reportData.table10) : [], [reportData?.table10, searchQuery, sortConfig]);
  const filteredTable11 = useMemo(() => reportData ? getProcessedRows(reportData.table11) : [], [reportData?.table11, searchQuery, sortConfig]);
  const filteredTable12 = useMemo(() => reportData ? getProcessedRows(reportData.table12) : [], [reportData?.table12, searchQuery, sortConfig]);
  const filteredTable13 = useMemo(() => reportData ? getProcessedRows(reportData.table13) : [], [reportData?.table13, searchQuery, sortConfig]);
  const filteredTable14 = useMemo(() => reportData ? getProcessedRows(reportData.table14) : [], [reportData?.table14, searchQuery, sortConfig]);
  const filteredTable15 = useMemo(() => reportData ? getProcessedRows(reportData.table15) : [], [reportData?.table15, searchQuery, sortConfig]);
  const filteredTable16 = useMemo(() => reportData ? getProcessedRows(reportData.table16) : [], [reportData?.table16, searchQuery, sortConfig]);
  const filteredTable17 = useMemo(() => reportData ? getProcessedRows(reportData.table17) : [], [reportData?.table17, searchQuery, sortConfig]);

  // Memoize Totals
  const totalTable10 = useMemo(() => calculateTotals(filteredTable10), [filteredTable10]);
  const totalTable12 = useMemo(() => calculateTotals(filteredTable12), [filteredTable12]);
  const totalTable14 = useMemo(() => calculateTotals(filteredTable14), [filteredTable14]);
  const totalTable16 = useMemo(() => calculateTotals(filteredTable16), [filteredTable16]);

  // --- MOCK SUMMARY DATA FOR TOP CARDS ---
  const summaryMetrics = [
      { label: 'Terima Borang (Hari Ini)', val: reportData ? totalTable10.terimaBorang.bil : 0, color: 'blue', icon: FileSpreadsheet },
      { label: 'Kelulusan (Hari Ini)', val: reportData ? totalTable10.kelulusan.bil : 0, color: 'indigo', icon: CheckCircle2 },
      { label: 'Pengeluaran (Hari Ini)', val: reportData ? `RM ${(Number(totalTable10.pengeluaran.amount)/1000).toFixed(1)}k` : '0', color: 'emerald', icon: Wallet },
      { label: 'Pending Process', val: 12, color: 'amber', icon: AlertTriangle },
  ];

  if (isLoading || !reportData) return <div className="p-12 text-center text-slate-500 font-medium animate-pulse flex flex-col items-center gap-2"><RefreshCw className="animate-spin text-brand-600"/> Memuatkan Laporan dari Cloud...</div>;

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-20">
      
      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {summaryMetrics.map((m, i) => (
              <div key={i} className={`bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-${m.color}-100 dark:border-${m.color}-900/30 flex items-center gap-4`}>
                  <div className={`p-3 rounded-lg bg-${m.color}-50 dark:bg-${m.color}-900/20 text-${m.color}-600 dark:text-${m.color}-400`}>
                      <m.icon size={20} />
                  </div>
                  <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide">{m.label}</p>
                      <h4 className="text-xl font-bold text-slate-800 dark:text-white">{m.val}</h4>
                  </div>
              </div>
          ))}
      </div>

      {/* Header & Controls */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col xl:flex-row justify-between gap-6 items-start xl:items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
             <div className="p-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-lg">
                <FileSpreadsheet size={24} /> 
             </div>
             Laporan Harian
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 ml-12">Urus dan pantau laporan harian pembiayaan mengikut skim.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
            <AISummary context="Laporan Harian Prestasi Pembiayaan" data={reportData} />

            <div className="relative group">
                <Calendar className="absolute left-3 top-2.5 text-slate-400 group-hover:text-brand-500 transition-colors" size={16} />
                <input 
                    type="date" 
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 hover:bg-white dark:hover:bg-slate-800 hover:border-brand-300 dark:hover:border-brand-600 rounded-xl text-sm focus:ring-4 focus:ring-brand-100 dark:focus:ring-brand-900/20 outline-none transition-all cursor-pointer font-medium text-slate-700 dark:text-slate-200 shadow-sm"
                />
            </div>
            
            <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 hidden md:block" />

            {(user?.role === 'admin' || user?.role === 'superadmin') && (
              <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all shadow-sm ${
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

             <button className="p-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm">
                <Printer size={18} />
            </button>
        </div>
      </div>

      {/* Modern Tabs - Pill/Segmented Control Style */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 bg-slate-100/80 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
            {[
                { id: 'harian', label: 'Harian & Bulanan' },
                { id: 'kumulatifYear', label: `Kumulatif ${selectedYear}` },
                { id: 'kumulatifLegacy', label: 'Kumulatif 2015 - Kini' }
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                        activeTab === tab.id 
                        ? 'bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                >
                    {tab.label}
                </button>
            ))}
        </div>
      </div>

      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        
        {/* TAB 1: HARIAN & BULANAN */}
        {activeTab === 'harian' && (
            <div className="grid grid-cols-1 gap-8">
                {/* TABLE 10 */}
                <ReportTable 
                    id="t10"
                    headers={getTableHeaders('t10')}
                    onHeaderUpdate={(k, v) => updateHeader(`t10_${k}`, v)}
                    rows={filteredTable10}
                    total={totalTable10}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table10', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable10, getTableHeaders('t10'))}
                    type="main"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />
                
                 {/* TABLE 11 */}
                <ReportTable 
                    id="t11"
                    headers={getTableHeaders('t11')}
                    onHeaderUpdate={(k, v) => updateHeader(`t11_${k}`, v)}
                    rows={filteredTable11}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table11', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable11, getTableHeaders('t11'))}
                    type="special"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="px-4 bg-[#F8FAFC] dark:bg-[#0B1120] text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Laporan Bulanan</span>
                  </div>
                </div>

                 {/* TABLE 12 */}
                 <ReportTable 
                    id="t12"
                    headers={getTableHeaders('t12')}
                    onHeaderUpdate={(k, v) => updateHeader(`t12_${k}`, v)}
                    rows={filteredTable12}
                    total={totalTable12}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table12', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable12, getTableHeaders('t12'))}
                    type="main"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />

                 {/* TABLE 13 */}
                 <ReportTable 
                    id="t13"
                    headers={getTableHeaders('t13')}
                    onHeaderUpdate={(k, v) => updateHeader(`t13_${k}`, v)}
                    rows={filteredTable13}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table13', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable13, getTableHeaders('t13'))}
                    type="special"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />
            </div>
        )}

        {/* TAB 2: KUMULATIF YEAR */}
        {activeTab === 'kumulatifYear' && (
            <div className="space-y-8">
                {/* TABLE 14 */}
                <ReportTable 
                    id="t14"
                    headers={getTableHeaders('t14')}
                    onHeaderUpdate={(k, v) => updateHeader(`t14_${k}`, v)}
                    rows={filteredTable14}
                    total={totalTable14}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table14', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable14, getTableHeaders('t14'))}
                    type="main"
                    showPercentage
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2">
                        {/* TABLE 15 */}
                        <ReportTable 
                            id="t15"
                            headers={getTableHeaders('t15')}
                            onHeaderUpdate={(k, v) => updateHeader(`t15_${k}`, v)}
                            rows={filteredTable15}
                            isEditing={isEditing}
                            onUpdate={(id, c, f, v) => updateTableData('table15', id, c, f, v)}
                            onSave={triggerAutoSave}
                            onExport={() => handleExportCSV(filteredTable15, getTableHeaders('t15'))}
                            type="special"
                            showPercentage
                            sortConfig={sortConfig}
                            onSort={handleSort}
                        />
                    </div>
                    
                    {/* SIDE TABLE FOR SABAH/SARAWAK */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden lg:mt-0">
                         <div className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600 px-5 py-4">
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                              <LayoutList size={14} className="text-slate-400" /> Kelulusan SPUT Mengikut Negeri
                            </h4>
                         </div>
                         <table className="w-full text-xs text-slate-600 dark:text-slate-300">
                             <thead className="bg-slate-50/50 dark:bg-slate-700/30 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                                 <tr>
                                     <th className="py-3 px-4 text-left">Negeri</th>
                                     <th className="py-3 px-4 text-center">Bil</th>
                                     <th className="py-3 px-4 text-center">Jumlah (RM)</th>
                                     <th className="py-3 px-4 text-center">%</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                 {reportData.table15Side.map((row, i) => (
                                     <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                         <td className="py-3 px-4 font-bold text-slate-700 dark:text-slate-200">{row.negeri}</td>
                                         <td className="py-3 px-4 text-center text-slate-600 dark:text-slate-300">{row.bil}</td>
                                         <td className="py-3 px-4 text-center font-mono text-slate-600 dark:text-slate-300">{formatNumber(row.amount)}</td>
                                         <td className="py-3 px-4 text-center font-bold text-brand-600 dark:text-brand-400">{row.percent}%</td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 3: KUMULATIF LEGACY */}
        {activeTab === 'kumulatifLegacy' && (
             <div className="space-y-8">
                 {/* TABLE 16 */}
                <ReportTable 
                    id="t16"
                    headers={getTableHeaders('t16')}
                    onHeaderUpdate={(k, v) => updateHeader(`t16_${k}`, v)}
                    rows={filteredTable16}
                    total={totalTable16}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table16', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable16, getTableHeaders('t16'))}
                    type="main"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />

                {/* TABLE 17 */}
                 <ReportTable 
                    id="t17"
                    headers={getTableHeaders('t17')}
                    onHeaderUpdate={(k, v) => updateHeader(`t17_${k}`, v)}
                    rows={filteredTable17}
                    isEditing={isEditing}
                    onUpdate={(id, c, f, v) => updateTableData('table17', id, c, f, v)}
                    onSave={triggerAutoSave}
                    onExport={() => handleExportCSV(filteredTable17, getTableHeaders('t17'))}
                    type="special"
                    sortConfig={sortConfig}
                    onSort={handleSort}
                />

                {/* NOTES SECTION */}
                <div className="mt-8 p-6 bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl transition-all hover:shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-amber-900 dark:text-amber-500 text-sm flex items-center gap-2">
                          <span className="w-2 h-2 bg-amber-500 rounded-full"></span> Nota Rujukan
                        </h4>
                        {isEditing && (
                             <button 
                                onClick={handleAddNote}
                                className="text-xs flex items-center gap-1 bg-white dark:bg-slate-700 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition font-semibold shadow-sm"
                             >
                                <Plus size={14} /> Tambah Nota
                             </button>
                        )}
                    </div>
                    
                    <ul className="space-y-2.5 ml-1">
                        {(reportData.notes || []).map((note, idx) => (
                           <li key={idx} className="flex items-start gap-3 group">
                              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 shrink-0"></span>
                              {isEditing ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <textarea 
                                    value={note}
                                    onChange={(e) => handleUpdateNote(idx, e.target.value)}
                                    onBlur={triggerAutoSave}
                                    className="flex-1 text-sm bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 rounded-lg p-2 focus:ring-2 focus:ring-amber-300 outline-none text-amber-900 dark:text-amber-400 resize-none"
                                    rows={1}
                                  />
                                  <button 
                                    onClick={() => handleDeleteNote(idx)}
                                    className="p-2 text-amber-400 hover:text-red-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition"
                                    title="Hapus Nota"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-sm text-amber-900/80 dark:text-amber-400/80 font-medium leading-relaxed">{note}</span>
                              )}
                           </li>
                        ))}
                    </ul>
                     {(reportData.notes || []).length === 0 && !isEditing && (
                        <p className="text-sm text-amber-900/40 dark:text-amber-500/40 italic pl-5">Tiada nota rujukan.</p>
                     )}
                </div>
             </div>
        )}

      </div>
    </div>
  );
};

// --- REUSABLE MODERN TABLE COMPONENT ---

interface ReportTableProps {
    id: string;
    headers: { title: string, subtitle: string, main: string, c1: string, c2: string, c3: string };
    onHeaderUpdate: (field: string, val: string) => void;
    rows: SchemeRow[];
    total?: { terimaBorang: ReportMetrics, kelulusan: ReportMetrics, pengeluaran: ReportMetrics };
    isEditing: boolean;
    onUpdate: (id: string, category: string, field: string, val: string) => void;
    onSave?: () => void;
    onExport?: () => void;
    type: 'main' | 'special';
    showPercentage?: boolean;
    sortConfig: SortConfig;
    onSort: (key: string) => void;
}

const SortIcon = ({ active, direction }: { active: boolean, direction: 'asc' | 'desc' }) => {
    if (!active) return <ArrowUpDown size={12} className="opacity-30" />;
    return direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />;
}

const SortHeader = ({ label, sortKey, currentSort, onSort, width, className = '' }: { label: React.ReactNode, sortKey: string, currentSort: SortConfig, onSort: (key: string) => void, width?: string, className?: string }) => {
    const isActive = currentSort?.key === sortKey;
    return (
        <th 
            className={`py-3 px-2 ${width || 'w-24'} border-b border-r border-slate-100 dark:border-slate-700/50 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors group select-none ${className}`}
            onClick={() => onSort(sortKey)}
        >
            <div className="flex items-center justify-center gap-1">
                {label}
                <SortIcon active={isActive} direction={currentSort?.direction || 'asc'} />
            </div>
        </th>
    );
};

const ReportTable: React.FC<ReportTableProps> = ({ id, headers, onHeaderUpdate, rows, total, isEditing, onUpdate, onSave, onExport, type, showPercentage, sortConfig, onSort }) => {
    return (
        <div className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
            <div className="bg-slate-50/80 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-600 px-6 py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="w-full">
                  {isEditing ? (
                      <div className="space-y-2 w-full">
                         <input 
                            value={headers.title}
                            onChange={(e) => onHeaderUpdate('title', e.target.value)}
                            onBlur={onSave}
                            className="w-full text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide bg-white dark:bg-slate-700 border border-brand-200 dark:border-brand-700 rounded-lg px-3 py-2 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            placeholder="Tajuk Laporan"
                         />
                         <input 
                            value={headers.subtitle}
                            onChange={(e) => onHeaderUpdate('subtitle', e.target.value)}
                            onBlur={onSave}
                            className="w-full text-sm text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 border border-brand-200 dark:border-brand-700 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
                            placeholder="Sub-tajuk"
                         />
                      </div>
                  ) : (
                    <>
                        <h3 className="text-base font-bold text-slate-800 dark:text-white uppercase tracking-wide flex items-center gap-2">
                           {headers.title}
                        </h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                           <Calendar size={12}/> {headers.subtitle}
                        </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {onExport && (
                        <button 
                            onClick={onExport}
                            className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors border border-transparent hover:border-green-100"
                            title="Muat Turun CSV"
                        >
                            <Download size={16} />
                        </button>
                    )}
                    {type === 'main' && !isEditing && (
                    <div className="flex gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5 rounded-lg border border-blue-100 dark:border-blue-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Terima
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Lulus
                        </span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Keluar
                        </span>
                    </div>
                    )}
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        {/* HEADER 1 */}
                        <tr className="text-center font-bold text-xs uppercase tracking-wide">
                            <th className="py-4 px-4 text-left text-slate-500 dark:text-slate-400 w-52 bg-white dark:bg-slate-800 border-b border-r border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group" onClick={() => onSort('name')}>
                                <div className="flex items-center gap-2">
                                    {isEditing ? <input value={headers.main} onChange={(e) => onHeaderUpdate('main', e.target.value)} onBlur={onSave} onClick={(e) => e.stopPropagation()} className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded" /> : headers.main}
                                    <SortIcon active={sortConfig?.key === 'name'} direction={sortConfig?.direction || 'asc'} />
                                </div>
                            </th>
                            <th colSpan={2} className="py-2 px-2 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-900/20 border-b border-r border-blue-100/50 dark:border-blue-800/30">
                                {isEditing ? <input value={headers.c1} onChange={(e) => onHeaderUpdate('c1', e.target.value)} onBlur={onSave} className="w-full text-center bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded" /> : headers.c1}
                            </th>
                            <th colSpan={2} className="py-2 px-2 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-900/20 border-b border-r border-indigo-100/50 dark:border-indigo-800/30">
                                {isEditing ? <input value={headers.c2} onChange={(e) => onHeaderUpdate('c2', e.target.value)} onBlur={onSave} className="w-full text-center bg-white dark:bg-slate-700 border border-indigo-200 dark:border-indigo-800 px-2 py-1 rounded" /> : headers.c2}
                            </th>
                            {type === 'main' && (
                                <th colSpan={2} className="py-2 px-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-900/20 border-b border-r border-emerald-100/50 dark:border-emerald-800/30">
                                     {isEditing ? <input value={headers.c3} onChange={(e) => onHeaderUpdate('c3', e.target.value)} onBlur={onSave} className="w-full text-center bg-white dark:bg-slate-700 border border-emerald-200 dark:border-emerald-800 px-2 py-1 rounded" /> : headers.c3}
                                </th>
                            )}
                            {showPercentage && <th className="bg-white dark:bg-slate-800 border-b border-l border-slate-100 dark:border-slate-700"></th>} 
                        </tr>
                        {/* HEADER 2 - SORTABLE */}
                        <tr className="text-center font-bold text-[11px] text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                             <th className="py-3 px-2 bg-slate-50/30 dark:bg-slate-700/20 border-b border-r border-slate-100 dark:border-slate-700"></th>
                             
                             <SortHeader label="Bil" sortKey="terimaBorang.bil" currentSort={sortConfig} onSort={onSort} className="bg-blue-50/20 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400" />
                             <SortHeader label="Jumlah (RM)" sortKey="terimaBorang.amount" currentSort={sortConfig} onSort={onSort} width="w-36" className="bg-blue-50/20 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400" />
                             
                             <SortHeader label="Bil" sortKey="kelulusan.bil" currentSort={sortConfig} onSort={onSort} className="bg-indigo-50/20 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400" />
                             <SortHeader label="Jumlah (RM)" sortKey="kelulusan.amount" currentSort={sortConfig} onSort={onSort} width="w-36" className="bg-indigo-50/20 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-400" />

                             {type === 'main' && (
                                <>
                                    <SortHeader label="Bil" sortKey="pengeluaran.bil" currentSort={sortConfig} onSort={onSort} className="bg-emerald-50/20 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400" />
                                    <SortHeader label="Jumlah (RM)" sortKey="pengeluaran.amount" currentSort={sortConfig} onSort={onSort} width="w-36" className="bg-emerald-50/20 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400" />
                                </>
                             )}
                             {showPercentage && <th className="py-3 px-2 w-20 bg-slate-50/30 dark:bg-slate-700/20 border-b border-l border-slate-100 dark:border-slate-700">%</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 dark:divide-slate-700/60">
                         {rows.map((row, idx) => (
                             <tr key={row.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-[#FAFAFA] dark:bg-slate-800/50'}`}>
                                 <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-300 border-r border-slate-100 dark:border-slate-700/50 text-xs uppercase tracking-tight group-hover:text-brand-700 dark:group-hover:text-brand-400 transition-colors">{row.name}</td>
                                 
                                 {/* Terima Borang */}
                                 <td className="p-0 border-r border-slate-100 dark:border-slate-700/50 text-center">
                                    <InputCell val={row.terimaBorang.bil} edit={isEditing} onChange={v => onUpdate(row.id, 'terimaBorang', 'bil', v)} onBlur={onSave} />
                                 </td>
                                 <td className="p-0 border-r border-slate-100 dark:border-slate-700/50 text-center bg-blue-50/5 dark:bg-blue-900/5 group-hover:bg-blue-50/20 dark:group-hover:bg-blue-900/10 transition-colors">
                                    <InputCell val={row.terimaBorang.amount} edit={isEditing} onChange={v => onUpdate(row.id, 'terimaBorang', 'amount', v)} onBlur={onSave} />
                                 </td>

                                 {/* Kelulusan */}
                                 <td className="p-0 border-r border-slate-100 dark:border-slate-700/50 text-center">
                                    <InputCell val={row.kelulusan.bil} edit={isEditing} onChange={v => onUpdate(row.id, 'kelulusan', 'bil', v)} onBlur={onSave} />
                                 </td>
                                 <td className="p-0 border-r border-slate-100 dark:border-slate-700/50 text-center bg-indigo-50/5 dark:bg-indigo-900/5 group-hover:bg-indigo-50/20 dark:group-hover:bg-indigo-900/10 transition-colors">
                                    <InputCell val={row.kelulusan.amount} edit={isEditing} onChange={v => onUpdate(row.id, 'kelulusan', 'amount', v)} onBlur={onSave} />
                                 </td>

                                 {/* Pengeluaran */}
                                 {type === 'main' && (
                                     <>
                                        <td className="p-0 border-r border-slate-100 dark:border-slate-700/50 text-center">
                                            <InputCell val={row.pengeluaran.bil} edit={isEditing} onChange={v => onUpdate(row.id, 'pengeluaran', 'bil', v)} onBlur={onSave} />
                                        </td>
                                        <td className="p-0 border-r border-slate-100 dark:border-slate-700/50 text-center bg-emerald-50/5 dark:bg-emerald-900/5 group-hover:bg-emerald-50/20 dark:group-hover:bg-emerald-900/10 transition-colors">
                                            <InputCell val={row.pengeluaran.amount} edit={isEditing} onChange={v => onUpdate(row.id, 'pengeluaran', 'amount', v)} onBlur={onSave} />
                                        </td>
                                     </>
                                 )}

                                 {showPercentage && <td className="text-center text-xs text-slate-300 dark:text-slate-600 font-medium">-</td>}
                             </tr>
                         ))}

                         {/* TOTAL ROW */}
                         {total && (
                             <tr className="bg-slate-50 dark:bg-slate-700/50 font-bold border-t-2 border-slate-200 dark:border-slate-600">
                                 <td className="py-4 px-4 border-r border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs uppercase tracking-widest">Jumlah Keseluruhan</td>
                                 <td className="py-4 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs">{formatNumber(total.terimaBorang.bil)}</td>
                                 <td className="py-4 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-blue-700 dark:text-blue-400 font-mono text-xs bg-blue-100/20 dark:bg-blue-900/20">{formatNumber(total.terimaBorang.amount)}</td>
                                 <td className="py-4 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs">{formatNumber(total.kelulusan.bil)}</td>
                                 <td className="py-4 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-indigo-700 dark:text-indigo-400 font-mono text-xs bg-indigo-100/20 dark:bg-indigo-900/20">{formatNumber(total.kelulusan.amount)}</td>
                                 <td className="py-4 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-mono text-xs">{formatNumber(total.pengeluaran.bil)}</td>
                                 <td className="py-4 px-2 text-center border-r border-slate-200 dark:border-slate-700 text-emerald-700 dark:text-emerald-400 font-mono text-xs bg-emerald-100/20 dark:bg-emerald-900/20">{formatNumber(total.pengeluaran.amount)}</td>
                                 {showPercentage && <td className="py-4 px-2 text-center text-brand-600 dark:text-brand-400 text-xs">96.45</td>}
                             </tr>
                         )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const InputCell = ({ val, edit, onChange, onBlur }: { val: number | string, edit: boolean, onChange: (v: string) => void, onBlur?: () => void }) => {
    const [local, setLocal] = useState<string | null>(null);

    if (!edit) {
        return (
            <div className="py-3.5 px-2 text-xs font-mono font-medium text-slate-600 dark:text-slate-400">
                {formatNumber(val)}
            </div>
        );
    }
    
    return (
        <div className="p-1 h-full">
            <input 
                className="w-full h-full text-center py-2 px-1 bg-white dark:bg-slate-700 border border-brand-200 dark:border-slate-600 rounded text-xs font-mono text-brand-700 dark:text-brand-300 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none shadow-sm transition-all placeholder:text-slate-300 hover:border-brand-300 dark:hover:border-slate-500"
                value={local !== null ? local : (val === 0 ? '' : val)}
                placeholder="-"
                onChange={e => {
                    setLocal(e.target.value);
                    onChange(e.target.value);
                }}
                onBlur={() => {
                    setLocal(null);
                    onBlur && onBlur();
                }}
            />
        </div>
    )
}

export default DailyReport;
