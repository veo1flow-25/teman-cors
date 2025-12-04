
import React, { useState } from 'react';
import pptxgen from 'pptxgenjs';
import { FileText, Loader2, Presentation } from 'lucide-react';
import { FinancingReportFullData, CollectionReportFullData, NPFReportFullData } from '../types';
import { api } from '../services/api';

interface ReportGeneratorProps {
  currentYear: number;
}

// --- DEFAULT DATA GENERATORS (Fallback) ---

const MONTHS = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
const MONTHS_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

const generateDefaultFinancingData = (year: number): FinancingReportFullData => ({
    year,
    monthlyPerformance: MONTHS.map((m, i) => ({
        id: `m_${i}`,
        month: m,
        targetBil: 1550,
        actualBil: [1132, 2004, 2696, 215, 1449, 1333, 1808, 1869, 1350, 2321, 0, 0][i] || 0,
        targetRM: 12916666.67,
        actualRM: [10610000, 17737000, 23399000, 1741000, 12389000, 10800000, 14783000, 14963000, 10810000, 19502000, 0, 0][i] || 0
    })),
    branchPerformance: [],
    topRankingBil: [],
    topRankingRM: [],
    bottomRankingBil: [],
    bottomRankingRM: [],
    unprocessedBranches: [],
    unprocessedDate: new Date().toLocaleDateString('en-GB')
});

const generateDefaultCollectionData = (year: number): CollectionReportFullData => {
    const SCHEMES = ['teman_tekun', 'temannita', 'teman_2', 'temannita_2', 'plus'];
    return {
        year,
        months: MONTHS_EN.map((m, i) => ({
            id: `col_${i}`,
            month: m,
            schemes: SCHEMES.reduce((acc, key) => {
                acc[key] = { pk: Math.floor(Math.random() * 500000) + 100000, dk: Math.floor(Math.random() * 600000) + 120000 };
                return acc;
            }, {} as Record<string, { pk: number, dk: number }>)
        }))
    };
};

const generateDefaultNPFData = (year: number): NPFReportFullData => {
    return {
        year,
        dataBil: MONTHS_EN.map((m, i) => ({
            id: `npf_${i}`,
            month: m,
            schemes: { 'all': 25 + Math.sin(i)*2 }
        })),
        dataRM: MONTHS_EN.map((m, i) => ({
            id: `npf_rm_${i}`,
            month: m,
            schemes: { 'all': 16 + Math.cos(i)*1.5 }
        }))
    };
};

const ReportGenerator: React.FC<ReportGeneratorProps> = ({ currentYear }) => {
  const [loading, setLoading] = useState(false);

  const generatePPT = async () => {
    setLoading(true);
    try {
        // 1. Initialize Pres
        const pres = new pptxgen();
        pres.layout = 'LAYOUT_16x9';
        
        // --- Fetch Data from Cloud (API) ---
        // Using api.getData ensures we get the latest Supabase data, failing back to local if needed.
        let financingData: FinancingReportFullData = await api.getData('financing', currentYear);
        let collectionData: CollectionReportFullData = await api.getData('collection', currentYear);
        let npfData: NPFReportFullData = await api.getData('npf', currentYear);

        console.log("[PPT Generator] Data Loaded:", { financing: financingData ? 'Yes' : 'No', collection: collectionData ? 'Yes' : 'No', npf: npfData ? 'Yes' : 'No' });

        // Fallback to defaults if null
        if (!financingData) financingData = generateDefaultFinancingData(currentYear);
        if (!collectionData) collectionData = generateDefaultCollectionData(currentYear);
        if (!npfData) npfData = generateDefaultNPFData(currentYear);

        // --- SLIDE 1: TITLE ---
        const slide1 = pres.addSlide();
        slide1.background = { color: '0F172A' }; // Dark Slate
        slide1.addText(`Laporan Prestasi Tahunan ${currentYear}`, {
            x: 0.5, y: '40%', w: '90%', fontSize: 44, color: 'FFFFFF', align: 'center', bold: true, fontFace: 'Arial'
        });
        slide1.addText('LAPORAN TEMAN C.O.R.S', {
            x: 0.5, y: '55%', w: '90%', fontSize: 18, color: '94A3B8', align: 'center', fontFace: 'Arial'
        });
        slide1.addText(`Dijana pada ${new Date().toLocaleDateString('ms-MY')}`, {
            x: 0.5, y: '90%', w: '90%', fontSize: 12, color: '475569', align: 'center'
        });

        // --- SLIDE 2: FINANCING ---
        const slide2 = pres.addSlide();
        slide2.addText('Prestasi Pembiayaan', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '4F46E5' });
        
        // Table Data
        const fHeaders = [
            { text: 'Bulan', options: { fill: { color: 'EEF2FF' }, color: '4F46E5', bold: true } },
            { text: 'Sasaran (RM)', options: { fill: { color: 'EEF2FF' }, color: '4F46E5', bold: true } },
            { text: 'Pencapaian (RM)', options: { fill: { color: 'EEF2FF' }, color: '4F46E5', bold: true } },
            { text: '%', options: { fill: { color: 'EEF2FF' }, color: '4F46E5', bold: true } },
        ];
        
        const fRows = financingData.monthlyPerformance.map(r => [
            { text: r.month },
            { text: r.targetRM.toLocaleString('en-MY', { maximumFractionDigits: 0 }) },
            { text: r.actualRM.toLocaleString('en-MY', { maximumFractionDigits: 0 }) },
            { text: `${(r.targetRM ? (r.actualRM / r.targetRM * 100) : 0).toFixed(1)}%` }
        ]);

        slide2.addTable([fHeaders, ...fRows], {
            x: 0.5, y: 1.2, w: '90%', fontSize: 10, border: { color: 'E2E8F0', pt: 1 }, rowH: 0.4
        });

        // --- SLIDE 3: COLLECTION ---
        const slide3 = pres.addSlide();
        slide3.addText('Prestasi Kutipan', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: '10B981' });
        
        const cHeaders = [
            { text: 'Bulan', options: { fill: { color: 'ECFDF5' }, color: '059669', bold: true } },
            { text: 'Dapat Kutip (DK)', options: { fill: { color: 'ECFDF5' }, color: '059669', bold: true } },
            { text: 'Prestasi (PK)', options: { fill: { color: 'ECFDF5' }, color: '059669', bold: true } },
            { text: '%', options: { fill: { color: 'ECFDF5' }, color: '059669', bold: true } },
        ];

        const cRows = collectionData.months.map(m => {
            const totalPK = Object.values(m.schemes).reduce((a, b) => a + b.pk, 0);
            const totalDK = Object.values(m.schemes).reduce((a, b) => a + b.dk, 0);
            return [
                { text: m.month.substring(0,3) },
                { text: totalDK.toLocaleString('en-MY', { maximumFractionDigits: 0 }) },
                { text: totalPK.toLocaleString('en-MY', { maximumFractionDigits: 0 }) },
                { text: `${(totalDK ? (totalPK / totalDK * 100) : 0).toFixed(1)}%` }
            ];
        });

        slide3.addTable([cHeaders, ...cRows], {
             x: 0.5, y: 1.2, w: '90%', fontSize: 10, border: { color: 'E2E8F0', pt: 1 }, rowH: 0.4
        });

        // --- SLIDE 4: NPF ---
        const slide4 = pres.addSlide();
        slide4.addText('Analisis NPF (Non-Performing Financing)', { x: 0.5, y: 0.5, fontSize: 24, bold: true, color: 'E11D48' });

        const nHeaders = [
            { text: 'Bulan', options: { fill: { color: 'FFF1F2' }, color: 'BE123C', bold: true } },
            { text: 'NPF Bil (%)', options: { fill: { color: 'FFF1F2' }, color: 'BE123C', bold: true } },
            { text: 'NPF RM (%)', options: { fill: { color: 'FFF1F2' }, color: 'BE123C', bold: true } },
        ];

        const nRows = npfData.dataBil.map((row, i) => [
            { text: row.month.substring(0, 3) },
            { text: `${(row.schemes['all'] || 0).toFixed(2)}%` },
            { text: `${(npfData.dataRM[i]?.schemes['all'] || 0).toFixed(2)}%` }
        ]);

        slide4.addTable([nHeaders, ...nRows], {
            x: 0.5, y: 1.2, w: '90%', fontSize: 10, border: { color: 'E2E8F0', pt: 1 }, rowH: 0.4
        });

        // Generate File
        await pres.writeFile({ fileName: `Laporan_Prestasi_TEMAN_${currentYear}.pptx` });

    } catch (error) {
        console.error("PPT Gen Error:", error);
        alert("Ralat semasa menjana PowerPoint. Sila pastikan data telah dimuatkan.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <button
      onClick={generatePPT}
      disabled={loading}
      className="hidden md:flex items-center gap-2 px-4 py-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-brand-600 hover:border-brand-200 rounded-xl transition-all shadow-sm text-sm font-bold active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
      title={`Jana Laporan PPT ${currentYear}`}
    >
      {loading ? (
        <Loader2 size={18} className="animate-spin text-brand-600" />
      ) : (
        <Presentation size={18} />
      )}
      <span>{loading ? 'Menjana PPT...' : 'Muat Turun PPT'}</span>
    </button>
  );
};

export default ReportGenerator;
