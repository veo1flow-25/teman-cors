import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

export const generateInsight = async (context: string, data: any, mode: 'fast' | 'deep' = 'fast'): Promise<string> => {
  try {
    const prompt = `
      Bertindak sebagai penganalisis data kewangan kanan.
      Analisis data berikut berkaitan dengan "${context}".
      Berikan ringkasan eksekutif pendek, kenal pasti trend utama, dan berikan 3 cadangan strategik untuk penambahbaikan prestasi.
      Gunakan Bahasa Melayu yang profesional.
      ${mode === 'deep' ? 'Sila gunakan pemikiran mendalam untuk menganalisis corak tersembunyi, risiko, dan peluang jangka panjang data ini secara kritikal.' : ''}
      
      Data:
      ${JSON.stringify(data, null, 2)}
    `;

    const modelName = mode === 'deep' ? 'gemini-1.5-pro' : 'gemini-1.5-flash';
    const model = genAI.getGenerativeModel({ model: modelName });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    return response.text() || "Tiada respons dihasilkan.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Maaf, terdapat ralat semasa menjana analisis AI. Sila pastikan API Key telah dikonfigurasi.";
  }
};
