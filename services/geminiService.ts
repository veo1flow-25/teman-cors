
import { GoogleGenAI } from "@google/genai";

// Fix: Mandatory initialization using process.env.API_KEY and correct models as per guidelines
export const generateInsight = async (context: string, data: any, mode: 'fast' | 'deep' = 'fast'): Promise<string> => {
  try {
    // Fix: Mandatory initialization pattern. Always use process.env.API_KEY.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
      Bertindak sebagai penganalisis data kewangan kanan.
      Analisis data berikut berkaitan dengan "${context}".
      Berikan ringkasan eksekutif pendek, kenal pasti trend utama, dan berikan 3 cadangan strategik untuk penambahbaikan prestasi.
      Gunakan Bahasa Melayu yang profesional.
      ${mode === 'deep' ? 'Sila gunakan pemikiran mendalam (Thinking Mode) untuk menganalisis corak tersembunyi, risiko, dan peluang jangka panjang data ini secara kritikal.' : ''}
      
      Data:
      ${JSON.stringify(data, null, 2)}
    `;

    // Fix: Use recommended Gemini 3 models based on task type. gemini-3-pro-preview for complex reasoning.
    const model = mode === 'deep' ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview';
    
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        // Fix: Use thinkingConfig for complex reasoning tasks as per guidelines
        ...(mode === 'deep' ? { thinkingConfig: { thinkingBudget: 32768 } } : {})
      }
    });

    // Fix: Access response.text as a property, not a method
    return response.text || "Tiada respons dihasilkan.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Maaf, analisis tidak dapat dijana. Ralat: ${error.message || 'Unknown error'}`;
  }
};
