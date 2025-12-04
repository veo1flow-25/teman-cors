import React, { useState } from 'react';
import { generateInsight } from '../services/geminiService';
import { Sparkles, Loader2, X, Brain } from 'lucide-react';

interface AISummaryProps {
  context: string;
  data: any;
}

const AISummary: React.FC<AISummaryProps> = ({ context, data }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'fast' | 'deep'>('fast');

  const handleGenerate = async (selectedMode: 'fast' | 'deep') => {
    setLoading(true);
    setMode(selectedMode);
    const result = await generateInsight(context, data, selectedMode);
    setInsight(result);
    setLoading(false);
  };

  const openModal = () => {
      setIsOpen(true);
      if (!insight) {
          handleGenerate('fast');
      }
  }

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <button
        onClick={openModal}
        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-md font-medium text-sm"
      >
        <Sparkles size={16} />
        Analisis AI
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center gap-2 text-indigo-900 font-semibold">
            {mode === 'deep' ? <Brain size={20} className="text-pink-600" /> : <Sparkles size={20} className="text-purple-600" />}
            <h3>Analisis Pintar Gemini {mode === 'deep' ? '(Thinking Mode)' : ''}: {context}</h3>
          </div>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700 p-1">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-3">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <p>{mode === 'deep' ? 'Sedang berfikir secara mendalam...' : 'Sedang menganalisis data prestasi...'}</p>
              {mode === 'deep' && <p className="text-xs text-pink-500 animate-pulse font-medium">Gemini 3.0 Pro sedang memproses logik...</p>}
            </div>
          ) : (
            <div className="prose prose-indigo max-w-none text-sm text-gray-700 leading-relaxed whitespace-pre-line">
              {insight}
            </div>
          )}
        </div>
        
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
            <div className="flex gap-2">
                 {mode === 'fast' && !loading && (
                     <button
                        onClick={() => handleGenerate('deep')}
                        className="flex items-center gap-2 px-3 py-2 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg text-xs font-bold hover:bg-pink-100 transition-colors shadow-sm"
                     >
                        <Brain size={14} /> Analisis Mendalam (Thinking Mode)
                     </button>
                 )}
                 {mode === 'deep' && !loading && (
                     <span className="text-xs font-medium text-pink-600 flex items-center gap-1 bg-pink-50 px-3 py-2 rounded-lg border border-pink-100">
                        <Brain size={14}/> Analisis Mendalam Aktif
                     </span>
                 )}
            </div>

            <button 
                onClick={handleClose}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium transition-colors"
            >
                Tutup
            </button>
        </div>
      </div>
    </div>
  );
};

export default AISummary;