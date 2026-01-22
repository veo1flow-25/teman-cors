
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, Wallet, AlertCircle, CheckCircle2, 
  Plus, Edit2, Save, Trash2, FileText, Activity, ArrowUpRight, ArrowDownRight, Target, RefreshCw, Cloud
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AISummary from './AISummary';
import { useYear, useSearch } from './Layout';
import { useAuth } from '../contexts/AuthContext';
import { KPIMetric, Perspective, KPISheet, KRA, KPI, SubKPI } from '../types';
import { api } from '../services/api';

// Initial Mock Data with Achievement Field
const initialKPIData: Perspective[] = [
  {
    id: 'p1',
    no: 1,
    description: 'Pembiayaan TEMAN TEKUN (40%)',
    kras: [
      {
        id: 'k1',
        no: 1,
        description: 'Penyaluran Pembiayaan (25%)',
        kpis: [
          {
            id: 'kp1',
            code: '1.1',
            description: 'Memantau Sasaran Pembiayaan Negeri',
            subKPIs: [
              { id: 's1', code: '1.1.1', description: 'Memastikan sasaran pengeluaran negeri dapat dicapai (Auto RM)', targetMidYear: '120000000', targetEndYear: '180000000', achievement: '0' }
            ]
          },
          {
            id: 'kp2',
            code: '1.2',
            description: 'Memantau Sasaran Bilangan Pembiayaan Negeri',
            subKPIs: [
              { id: 's2', code: '1.2.1', description: 'Memastikan sasaran bilangan pembiayaan negeri dapat dicapai (Auto Bil)', targetMidYear: '11160', targetEndYear: '15000', achievement: '0' }
            ]
          },
          {
            id: 'kp3',
            code: '1.3',
            description: 'Proses Penyaluran Pembiayaan',
            subKPIs: [
              { id: 's3', code: '1.3.1', description: 'Proses semakan dan jual beli BSAS', targetMidYear: 'Jan - Jun', targetEndYear: 'Jul - Dis', achievement: 'Sedang Berjalan', manualStatus: 'Sedang Berjalan' },
              { id: 's4', code: '1.3.2', description: 'Arahan EFT ke Jabatan Akaun & Kewangan setiap hari', targetMidYear: 'Harian', targetEndYear: 'Harian', achievement: 'Dilaksanakan', manualStatus: 'Selesai' }
            ]
          }
        ]
      },
      {
        id: 'k2',
        no: 2,
        description: 'Tempoh Kelulusan 7 Hari Bekerja (10%)',
        kpis: [
          {
            id: 'kp4',
            code: '2.1',
            description: 'Proses Kelulusan Pembiayaan',
            subKPIs: [
              { id: 's5', code: '2.1.1', description: 'Kelulusan di Peringkat Pejabat Negeri dan Ibu Pejabat', targetMidYear: 'Jan - Jun', targetEndYear: 'Jul - Dis', achievement: '100%', manualStatus: 'Selesai' },
              { id: 's6', code: '2.1.2', description: 'Memastikan proses kelulusan mengikut tempoh yang ditetapkan', targetMidYear: '7 Hari', targetEndYear: '7 Hari', achievement: '5 Hari', manualStatus: 'Selesai' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'p2',
    no: 2,
    description: 'Pengurusan Bayaran Balik (20%)',
    kras: [
      {
        id: 'k4',
        no: 1,
        description: 'Prestasi Bayaran Balik (10%)',
        kpis: [
          {
            id: 'kp6',
            code: '1.1',
            description: 'Mencapai Sasaran Kutipan (Auto)',
            subKPIs: [
              { id: 's8', code: '1.1.1', description: 'Peningkatan bayaran balik melebihi 90% daripada patut kutip', targetMidYear: '60000000', targetEndYear: '120000000', achievement: '0' }
            ]
          }
        ]
      },
      {
        id: 'k5',
        no: 2,
        description: 'Prestasi NPF (10%)',
        kpis: [
          {
            id: 'kp7',
            code: '2.1',
            description: 'Menurunkan Kadar NPF (Auto)',
            subKPIs: [
              { id: 's9', code: '2.1.1', description: 'Menurunkan Kadar NPF TEMAN 2.0 ≤ 5%, Teman TEKUN & TemanNita ≤ 11%', targetMidYear: '5', targetEndYear: '4', achievement: '0' }
            ]
          }
        ]
      }
    ]
  }
];

const kpiMetrics: KPIMetric[] = [
  { id: '1', title: 'Jumlah Pembiayaan', value: 'RM 12.5M', change: 12.5, target: 'RM 10.0M', icon: 'wallet', link: '/financing' },
  { id: '2', title: 'Kadar Kutipan', value: '94.2%', change: -1.2, target: '95.0%', icon: 'check', link: '/collection' },
  { id: '3', title: 'Kadar NPF', value: '2.8%', change: -0.5, target: '< 3.0%', icon: 'alert', link: '/npf' },
  { id: '4', title: 'Pelanggan Aktif', value: '1,240', change: 5.4, target: '1,200', icon: 'users', link: '/daily' },
];

const STATUS_OPTIONS = [
    'Perlu Tumpuan',
    'Sedang Berjalan',
    'Dalam Pantauan',
    'Selesai'
];

const Dashboard: React.FC = () => {
  const { selectedYear } = useYear();
  const { searchQuery } = useSearch();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sheets, setSheets] = useState<KPISheet[]>([
    { id: 'sheet1', title: `KPI ${selectedYear}`, data: initialKPIData },
    { id: 'sheet2', title: `KPI ${selectedYear - 1}`, data: [] }
  ]);
  const [activeSheetId, setActiveSheetId] = useState('sheet1');
  const [isEditing, setIsEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isSyncing, setIsSyncing] = useState(false);

  const activeSheetIndex = sheets.findIndex(s => s.id === activeSheetId);
  const activeData = sheets[activeSheetIndex]?.data || [];

  // --- AUTOMATED DATA FETCHING LOGIC ---
  const syncMetricsFromReports = async () => {
      setIsSyncing(true);
      console.log(`[Dashboard] Memulakan sinkronisasi data dari Supabase untuk tahun ${selectedYear}...`);
      
      try {
        // 1. Fetch Financing Data from Cloud/API
        const financingData = await api.getData('financing', selectedYear);
        
        let totalFinancingRM = 0;
        let totalFinancingBil = 0;
        if (financingData && financingData.monthlyPerformance) {
            financingData.monthlyPerformance.forEach((m: any) => {
                totalFinancingRM += (m.actualRM || 0);
                totalFinancingBil += (m.actualBil || 0);
            });
        }

        // 2. Fetch Collection Data
        const collectionData = await api.getData('collection', selectedYear);

        let totalCollectionPK = 0;
        if (collectionData && collectionData.months) {
            collectionData.months.forEach((m: any) => {
                if (m.schemes) {
                    Object.values(m.schemes).forEach((s: any) => {
                        totalCollectionPK += (s.pk || 0);
                    });
                }
            });
        }

        // 3. Fetch NPF Data (Average NPF RM)
        const npfData = await api.getData('npf', selectedYear);

        let avgNPF = 0;
        if (npfData && npfData.dataRM) {
            const totalNPF = npfData.dataRM.reduce((acc: number, row: any) => {
                if (row.schemes) {
                    return acc + (row.schemes['all'] || 0);
                }
                return acc;
            }, 0);
            avgNPF = npfData.dataRM.length > 0 ? totalNPF / npfData.dataRM.length : 0;
        }

        console.log(`[Dashboard Sync] Hasil Kiraan: Pembiayaan RM=${totalFinancingRM}, Bil=${totalFinancingBil}, Kutipan=${totalCollectionPK}, NPF=${avgNPF}%`);

        // 4. Update the KPI Data with fetched values
        const newSheets = [...sheets];
        const newData = [...newSheets[activeSheetIndex].data];

        newData.forEach(perspective => {
            perspective.kras.forEach(kra => {
                kra.kpis.forEach(kpi => {
                    kpi.subKPIs.forEach(sub => {
                        // AUTO MATCHING LOGIC BASED ON KEYWORDS
                        const desc = sub.description.toLowerCase();
                        
                        // Match Financing RM
                        if ((desc.includes('pengeluaran') || desc.includes('pembiayaan')) && desc.includes('rm') && !desc.includes('npf')) {
                            if (totalFinancingRM > 0) sub.achievement = totalFinancingRM.toString();
                        }
                        // Match Financing Bil
                        else if ((desc.includes('bilangan') || desc.includes('bil')) && desc.includes('pembiayaan')) {
                            if (totalFinancingBil > 0) sub.achievement = totalFinancingBil.toString();
                        }
                        // Match Collection
                        else if (desc.includes('bayaran balik') || desc.includes('kutipan')) {
                            if (totalCollectionPK > 0) sub.achievement = totalCollectionPK.toString();
                        }
                        // Match NPF
                        else if (desc.includes('npf') || desc.includes('kadar')) {
                            if (avgNPF > 0) sub.achievement = avgNPF.toFixed(2);
                        }
                    });
                });
            });
        });

        newSheets[activeSheetIndex].data = newData;
        setSheets(newSheets);
      } catch (error) {
          console.error("[Dashboard Sync Error]", error);
      } finally {
          setIsSyncing(false);
      }
  };

  // Run Sync on Mount or Year Change
  useEffect(() => {
      syncMetricsFromReports();
  }, [selectedYear, activeSheetId]);


  // Auto Save
  const triggerAutoSave = async () => {
    setSaveStatus('saving');
    // Simulate API call for KPI data
    await new Promise(r => setTimeout(r, 500)); 
    // In a real app, you would save `sheets` to the backend here
    // api.saveData('kpi', selectedYear, sheets);
    setSaveStatus('saved');
    
    if (user?.email) {
        api.logActivity(user.email, 'UPDATE_KPI', `Updated KPI Dashboard for ${selectedYear}`);
    }

    setTimeout(() => setSaveStatus('idle'), 2000);
  };


  // Filter Logic
  const filteredData = useMemo(() => {
    if (!searchQuery) return activeData;

    const lowerQuery = searchQuery.toLowerCase();
    
    return activeData.map(perspective => {
      const perspectiveMatch = perspective.description.toLowerCase().includes(lowerQuery);
      
      const filteredKRAs = perspective.kras.map(kra => {
        const kraMatch = kra.description.toLowerCase().includes(lowerQuery);

        const filteredKPIs = kra.kpis.map(kpi => {
           const kpiMatch = kpi.description.toLowerCase().includes(lowerQuery) || kpi.code.toLowerCase().includes(lowerQuery);
           
           const filteredSubKPIs = kpi.subKPIs.filter(sub => 
              sub.description.toLowerCase().includes(lowerQuery) || 
              sub.code.toLowerCase().includes(lowerQuery) ||
              kpiMatch || kraMatch || perspectiveMatch
           );

           if (filteredSubKPIs.length > 0) {
              return { ...kpi, subKPIs: filteredSubKPIs };
           }
           return null;
        }).filter((k): k is KPI => k !== null);

        if (filteredKPIs.length > 0) {
            return { ...kra, kpis: filteredKPIs };
        }
        return null;
      }).filter((k): k is KRA => k !== null);

      if (filteredKRAs.length > 0) {
          return { ...perspective, kras: filteredKRAs };
      }
      return null;
    }).filter((p): p is Perspective => p !== null);

  }, [activeData, searchQuery]);

  // Universal Update Handler
  const handleDeepUpdate = (indices: number[], field: string, value: string) => {
    const newSheets = [...sheets];
    const sheetData = [...newSheets[activeSheetIndex].data];
    const [pIdx, kIdx, kpIdx, sIdx] = indices;

    if (indices.length === 1) { // Perspective
         // @ts-ignore
        if (sheetData[pIdx]) sheetData[pIdx][field] = value;
    }
    else if (indices.length === 2) { // KRA
         // @ts-ignore
        if (sheetData[pIdx]?.kras[kIdx]) sheetData[pIdx].kras[kIdx][field] = value;
    }
    else if (indices.length === 3) { // KPI
         // @ts-ignore
        if (sheetData[pIdx]?.kras[kIdx]?.kpis[kpIdx]) sheetData[pIdx].kras[kIdx].kpis[kpIdx][field] = value;
    }
    else if (indices.length === 4) { // SubKPI
        const subKPI = sheetData[pIdx]?.kras[kIdx]?.kpis[kpIdx]?.subKPIs[sIdx];
        if (subKPI) {
             // @ts-ignore
            subKPI[field] = value;
        }
    }
    newSheets[activeSheetIndex].data = sheetData;
    setSheets(newSheets);
  };

  // Add Item Handlers
  const addKRA = (pIdx: number) => {
      const newSheets = [...sheets];
      const p = newSheets[activeSheetIndex].data[pIdx];
      const newKRA: KRA = {
          id: `kra_${Date.now()}`,
          no: p.kras.length + 1,
          description: 'KRA Baru',
          kpis: []
      };
      p.kras.push(newKRA);
      setSheets(newSheets);
      triggerAutoSave();
  }

  const addKPI = (pIdx: number, kIdx: number) => {
      const newSheets = [...sheets];
      const k = newSheets[activeSheetIndex].data[pIdx].kras[kIdx];
      const newKPI: KPI = {
          id: `kpi_${Date.now()}`,
          code: `${k.no}.${k.kpis.length + 1}`,
          description: 'KPI Baru',
          subKPIs: []
      };
      k.kpis.push(newKPI);
      setSheets(newSheets);
      triggerAutoSave();
  }

  const addSubKPI = (pIdx: number, kIdx: number, kpIdx: number) => {
      const newSheets = [...sheets];
      const kp = newSheets[activeSheetIndex].data[pIdx].kras[kIdx].kpis[kpIdx];
      const newSub: SubKPI = {
          id: `sub_${Date.now()}`,
          code: `${kp.code}.${kp.subKPIs.length + 1}`,
          description: 'Sub-KPI Baru',
          targetMidYear: '-',
          targetEndYear: '-',
          achievement: '-'
      };
      kp.subKPIs.push(newSub);
      setSheets(newSheets);
      triggerAutoSave();
  }

  const removeSubKPI = (pIdx: number, kIdx: number, kpIdx: number, sIdx: number) => {
      if (!confirm('Padam Sub-KPI ini?')) return;
      const newSheets = [...sheets];
      newSheets[activeSheetIndex].data[pIdx].kras[kIdx].kpis[kpIdx].subKPIs.splice(sIdx, 1);
      setSheets(newSheets);
      triggerAutoSave();
  }

  const addTab = () => {
    const newId = `sheet${sheets.length + 1}`;
    setSheets([...sheets, { id: newId, title: `KPI Baru ${sheets.length + 1}`, data: initialKPIData }]);
    setActiveSheetId(newId);
  };

  const deleteTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (sheets.length === 1) return;
    const newSheets = sheets.filter(s => s.id !== id);
    setSheets(newSheets);
    if (activeSheetId === id) setActiveSheetId(newSheets[0].id);
  };

  const formatValue = (val: string) => {
      const num = parseFloat(val);
      if (!isNaN(num) && val.length > 3) { // Assume simple numbers are raw, large numbers are currency
          return num.toLocaleString('en-MY');
      }
      return val;
  }

  const getStatusComponent = (sub: SubKPI, pIdx: number, kIdx: number, kpIdx: number, sIdx: number) => {
      const cleanTarget = parseFloat(sub.targetMidYear.replace(/[^0-9.]/g, ''));
      const cleanActual = parseFloat(sub.achievement.replace(/[^0-9.]/g, ''));
      
      // LOGIC: If both are numbers, calc %. Else show dropdown.
      const isNumeric = !isNaN(cleanTarget) && !isNaN(cleanActual) && cleanTarget > 0;

      if (isNumeric) {
          // Percent Calculation
          const percent = (cleanActual / cleanTarget) * 100;
          let color = 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-300';
          if (percent >= 100) color = 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-400';
          else if (percent >= 80) color = 'text-amber-700 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-400';
          else color = 'text-rose-700 bg-rose-100 dark:bg-rose-900/40 dark:text-rose-400';

          return (
              <div className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${color} border border-transparent shadow-sm`}>
                  {percent >= 100 ? <CheckCircle2 size={14}/> : <Activity size={14}/>}
                  {percent.toFixed(1)}%
              </div>
          );
      } else {
          // Dropdown Status Logic
          if (isEditing) {
              return (
                  <select 
                     className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-xs rounded p-1 w-full outline-none focus:ring-2 focus:ring-indigo-500"
                     value={sub.manualStatus || 'Dalam Pantauan'}
                     onChange={(e) => {
                         handleDeepUpdate([pIdx, kIdx, kpIdx, sIdx], 'manualStatus', e.target.value);
                         triggerAutoSave();
                     }}
                  >
                      {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              )
          } else {
             const status = sub.manualStatus || 'Dalam Pantauan';
             let color = 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
             if (status === 'Selesai') color = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
             if (status === 'Sedang Berjalan') color = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400';
             if (status === 'Perlu Tumpuan') color = 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400';
             
             return (
                 <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide ${color} border border-white/50 dark:border-slate-600/50 shadow-sm`}>
                     {status}
                 </span>
             )
          }
      }
  }

  const canEdit = user?.role === 'admin' || user?.role === 'superadmin';

  return (
    <div className="space-y-8 max-w-[1800px] mx-auto pb-12">
      {/* Metrics Summary Row - Clickable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiMetrics.map((metric) => (
          <div 
            key={metric.id} 
            onClick={() => metric.link && navigate(metric.link)}
            className="block group cursor-pointer"
          >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
               <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl ${
                    metric.change >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400'
                  }`}>
                    {metric.icon === 'wallet' && <Wallet size={24} />}
                    {metric.icon === 'check' && <CheckCircle2 size={24} />}
                    {metric.icon === 'alert' && <AlertCircle size={24} />}
                    {metric.icon === 'users' && <Users size={24} />}
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
                     metric.change >= 0 ? 'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                  }`}>
                     {metric.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                     {Math.abs(metric.change)}%
                  </div>
               </div>
               <div>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{metric.title}</p>
                  <h3 className="text-3xl font-bold text-slate-800 dark:text-white">{metric.value}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Sasaran: <span className="font-semibold text-slate-600 dark:text-slate-300">{metric.target}</span></p>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPI Section */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
         {/* Header & Tabs */}
         <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
                {sheets.map(sheet => (
                  <div 
                    key={sheet.id}
                    onClick={() => setActiveSheetId(sheet.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer text-sm font-bold whitespace-nowrap transition-all ${
                      activeSheetId === sheet.id 
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    <FileText size={16} />
                    {sheet.title}
                    {isEditing && (
                      <button onClick={(e) => deleteTab(e, sheet.id)} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-full transition-colors">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <button onClick={addTab} className="p-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                    <Plus size={18} />
                  </button>
                )}
            </div>
            
            <div className="flex items-center gap-3">
               <button onClick={syncMetricsFromReports} disabled={isSyncing} className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 text-xs font-bold transition disabled:opacity-50">
                   <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""}/> {isSyncing ? "Syncing..." : "Auto-Sync Data"}
               </button>
               <AISummary context={`Analisis KPI - ${sheets[activeSheetIndex]?.title}`} data={filteredData} />
               
               {canEdit && (
                 <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    isEditing 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                      : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'
                  }`}
                 >
                   {isEditing ? <Save size={16} /> : <Edit2 size={16} />}
                   {isEditing ? 'Selesai' : 'Sunting'}
                 </button>
               )}

                {/* Save Status Indicator */}
                <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                    saveStatus === 'saved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30' :
                    saveStatus === 'saving' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30' :
                    'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 opacity-0'
                }`}>
                    {saveStatus === 'saving' ? <RefreshCw className="animate-spin" size={14} /> : <Cloud size={14} />}
                    {saveStatus === 'saving' ? 'Menyimpan...' : 'Disimpan'}
                </div>
            </div>
         </div>

         {/* Content */}
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 w-[40%]">Petunjuk Prestasi Utama (KPI)</th>
                  <th className="px-6 py-4 text-center w-[20%]">Prestasi (Jan - Jun)</th>
                  <th className="px-6 py-4 text-center w-[20%]">Sasaran (Jul - Dis)</th>
                  <th className="px-6 py-4 text-center w-[20%]">Status Keseluruhan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredData.map((perspective, pIdx) => (
                   <React.Fragment key={perspective.id}>
                      {/* Perspective Row */}
                      <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-t-2 border-slate-200 dark:border-slate-700">
                        <td colSpan={4} className="px-6 py-4 font-bold text-slate-800 dark:text-slate-100 text-sm uppercase tracking-wider">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-3">
                                <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">{perspective.no}</span>
                                {isEditing ? (
                                    <input 
                                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                                    value={perspective.description}
                                    onChange={(e) => handleDeepUpdate([pIdx], 'description', e.target.value)}
                                    onBlur={triggerAutoSave}
                                    />
                                ) : (
                                    <span className="text-indigo-900 dark:text-indigo-200">{perspective.description}</span>
                                )}
                             </div>
                             {isEditing && (
                                 <button onClick={() => addKRA(pIdx)} className="flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30">
                                     <Plus size={14}/> Tambah KRA
                                 </button>
                             )}
                           </div>
                        </td>
                      </tr>
                      {perspective.kras.map((kra, kIdx) => (
                         <React.Fragment key={kra.id}>
                             {/* KRA Row */}
                             <tr className="bg-indigo-50/30 dark:bg-indigo-900/10">
                               <td colSpan={4} className="px-6 py-3 pl-14 font-semibold text-slate-700 dark:text-slate-300 text-xs uppercase border-b border-slate-100 dark:border-slate-700/50">
                                  <div className="flex items-center justify-between">
                                      {isEditing ? (
                                          <div className="flex items-center gap-2 w-full max-w-2xl">
                                              <span className="shrink-0 text-indigo-500 dark:text-indigo-400 font-bold">KRA {kra.no}:</span>
                                              <input 
                                                  className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-slate-100"
                                                  value={kra.description}
                                                  onChange={(e) => handleDeepUpdate([pIdx, kIdx], 'description', e.target.value)}
                                                  onBlur={triggerAutoSave}
                                              />
                                          </div>
                                      ) : (
                                          <div className="flex items-center gap-2">
                                              <span className="text-indigo-500 dark:text-indigo-400 font-bold">KRA {kra.no}:</span>
                                              {kra.description}
                                          </div>
                                      )}
                                      {isEditing && (
                                        <button onClick={() => addKPI(pIdx, kIdx)} className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-1 rounded shadow-sm">
                                            <Plus size={12}/> Tambah KPI
                                        </button>
                                      )}
                                  </div>
                               </td>
                             </tr>
                             {kra.kpis.map((kpi, kpIdx) => (
                                <React.Fragment key={kpi.id}>
                                   {/* KPI Row */}
                                   <tr className="group hover:bg-slate-50 dark:hover:bg-slate-700/30">
                                      <td className="px-6 py-4 pl-16 align-top">
                                         <div className="flex items-baseline gap-3 mb-4">
                                            {isEditing ? (
                                                <div className="flex gap-2 w-full">
                                                    <input 
                                                        className="w-16 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 outline-none text-xs font-mono text-slate-800 dark:text-slate-200"
                                                        value={kpi.code}
                                                        onChange={(e) => handleDeepUpdate([pIdx, kIdx, kpIdx], 'code', e.target.value)}
                                                        onBlur={triggerAutoSave}
                                                    />
                                                    <input 
                                                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none font-medium text-slate-800 dark:text-slate-200"
                                                        value={kpi.description}
                                                        onChange={(e) => handleDeepUpdate([pIdx, kIdx, kpIdx], 'description', e.target.value)}
                                                        onBlur={triggerAutoSave}
                                                    />
                                                    <button onClick={() => addSubKPI(pIdx, kIdx, kpIdx)} className="p-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/40 border border-green-200 dark:border-green-800" title="Tambah Sub-KPI">
                                                        <Plus size={14}/>
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <span className="text-slate-400 dark:text-slate-500 font-mono text-xs shrink-0">{kpi.code}</span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-medium">{kpi.description}</span>
                                                </>
                                            )}
                                         </div>
                                         <div className="space-y-6 pl-8 border-l-2 border-slate-100 dark:border-slate-700 ml-1.5">
                                            {kpi.subKPIs.map((sub, sIdx) => (
                                              <div key={sub.id} className="text-xs text-slate-600 dark:text-slate-400 min-h-[40px] flex items-center">
                                                  <div className="flex items-start gap-3 w-full">
                                                     <div className="w-1.5 h-1.5 rounded-full bg-indigo-300 dark:bg-indigo-600 shrink-0 mt-1.5"></div>
                                                     {isEditing ? (
                                                         <div className="flex gap-2 w-full">
                                                            <textarea 
                                                                className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 outline-none resize-none overflow-hidden text-slate-600 dark:text-slate-300"
                                                                rows={2}
                                                                value={sub.description}
                                                                onChange={(e) => handleDeepUpdate([pIdx, kIdx, kpIdx, sIdx], 'description', e.target.value)}
                                                                onBlur={triggerAutoSave}
                                                            />
                                                            <button onClick={() => removeSubKPI(pIdx, kIdx, kpIdx, sIdx)} className="text-red-400 hover:text-red-600 h-fit">
                                                                <Trash2 size={14}/>
                                                            </button>
                                                         </div>
                                                     ) : (
                                                         <span className="leading-relaxed">{sub.description}</span>
                                                     )}
                                                  </div>
                                              </div>
                                            ))}
                                         </div>
                                      </td>
                                      
                                      {/* Prestasi Column (Stacked: Target & Achievement) */}
                                      <td className="px-6 py-4 text-center align-top bg-slate-50/30 dark:bg-slate-700/10">
                                          <div className="pt-[52px] space-y-6">
                                            {kpi.subKPIs.map((sub, sIdx) => (
                                                <div key={sub.id} className="min-h-[40px] flex flex-col items-center justify-center gap-1.5">
                                                    {isEditing ? (
                                                        <div className="flex flex-col gap-1 w-full max-w-[120px]">
                                                            <input 
                                                                className="text-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] placeholder:text-slate-300 text-slate-700 dark:text-slate-200"
                                                                value={sub.targetMidYear}
                                                                onChange={(e) => handleDeepUpdate([pIdx, kIdx, kpIdx, sIdx], 'targetMidYear', e.target.value)}
                                                                onBlur={triggerAutoSave}
                                                                placeholder="Sasaran"
                                                            />
                                                            <input 
                                                                className="text-center bg-white dark:bg-slate-700 border border-emerald-300 dark:border-emerald-700 rounded px-1 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 placeholder:text-emerald-200"
                                                                value={sub.achievement}
                                                                onChange={(e) => handleDeepUpdate([pIdx, kIdx, kpIdx, sIdx], 'achievement', e.target.value)}
                                                                onBlur={triggerAutoSave}
                                                                placeholder="Pencapaian"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-md shadow-sm w-full max-w-[140px]">
                                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 uppercase mr-1">Sasaran:</span>
                                                                {formatValue(sub.targetMidYear)}
                                                            </div>
                                                            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 px-2 py-0.5 rounded-md w-full max-w-[140px]">
                                                                <span className="text-[9px] text-emerald-400 dark:text-emerald-600 uppercase mr-1">Capai:</span>
                                                                {formatValue(sub.achievement)}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            ))}
                                          </div>
                                      </td>

                                      {/* End Year Target Column */}
                                      <td className="px-6 py-4 text-center align-top">
                                          <div className="pt-[52px] space-y-6">
                                            {kpi.subKPIs.map((sub, sIdx) => (
                                                <div key={sub.id} className="min-h-[40px] flex items-center justify-center">
                                                    {isEditing ? (
                                                        <input 
                                                            className="w-full max-w-[100px] text-center bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-1 py-1 text-[10px] text-slate-700 dark:text-slate-200"
                                                            value={sub.targetEndYear}
                                                            onChange={(e) => handleDeepUpdate([pIdx, kIdx, kpIdx, sIdx], 'targetEndYear', e.target.value)}
                                                            onBlur={triggerAutoSave}
                                                        />
                                                    ) : (
                                                        <span className="font-mono text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{formatValue(sub.targetEndYear)}</span>
                                                    )}
                                                </div>
                                            ))}
                                          </div>
                                      </td>

                                      {/* Status Column (% or Dropdown) */}
                                      <td className="px-6 py-4 text-center align-top bg-slate-50/30 dark:bg-slate-700/10">
                                          <div className="pt-[52px] space-y-6">
                                              {kpi.subKPIs.map((sub, sIdx) => (
                                                  <div key={sub.id} className="min-h-[40px] flex items-center justify-center">
                                                      {getStatusComponent(sub, pIdx, kIdx, kpIdx, sIdx)}
                                                  </div>
                                              ))}
                                          </div>
                                      </td>
                                   </tr>
                                </React.Fragment>
                             ))}
                         </React.Fragment>
                      ))}
                   </React.Fragment>
                ))}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

export default Dashboard;
