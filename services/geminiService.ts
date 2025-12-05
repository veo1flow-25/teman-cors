import { GoogleGenAI } from "@google/genai";

// Use API Key strictly from process.env.API_KEY as per guidelines
const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

export const generateInsight = async (context: string, data: any, mode: 'fast' | 'deep' = 'fast'): Promise<string> => {
  if (!apiKey) {
    console.warn("Gemini API Key missing");
    return "API Key Gemini tidak ditemui. Sila konfigurasi process.env.API_KEY.";
  }

  try {
    const prompt = `
      Bertindak sebagai penganalisis data kewangan kanan.
      Analisis data berikut berkaitan dengan "${context}".
      Berikan ringkasan eksekutif pendek, kenal pasti trend utama, dan berikan 3 cadangan strategik untuk penambahbaikan prestasi.
      Gunakan Bahasa Melayu yang profesional.
      ${mode === 'deep' ? 'Sila gunakan pemikiran mendalam (Thinking Mode) untuk menganalisis corak tersembunyi, risiko, dan peluang jangka panjang data ini secara kritikal.' : ''}
      
      Data:
      ${JSON.stringify(data, null, 2)}
    `;

    // Guidelines: Basic Text Tasks -> gemini-2.5-flash, Complex -> gemini-3-pro-preview
    let model = 'gemini-2.5-flash';
    let config: any = {};

    if (mode === 'deep') {
      model = 'gemini-3-pro-preview'; 
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    return response.text || "Tiada respons dihasilkan.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Maaf, terdapat ralat semasa menjana analisis AI. Sila pastikan API Key sah.";
  }
};