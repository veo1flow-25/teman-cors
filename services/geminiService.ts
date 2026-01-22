import { GoogleGenAI } from "@google/genai";

export const generateInsight = async (context: string, data: any, mode: 'fast' | 'deep' = 'fast'): Promise<string> => {
  try {
    // 1. Dapatkan API Key secara selamat
    // Nota: Mengikut arahan, kita mesti guna process.env.API_KEY.
    // Jika dalam environment Vite/Browser yang tidak menyokong process.env secara langsung,
    // kod ini mungkin perlu disesuaikan dengan bundler (cth: import.meta.env), 
    // tetapi untuk mematuhi arahan standard, kita guna fallback selamat.
    
    let apiKey = '';
    try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            apiKey = process.env.API_KEY;
        }
    } catch (e) {
        // Abaikan ralat 'process is not defined'
    }

    // 2. Jika tiada API Key, jangan crash, pulangkan mesej mesra.
    if (!apiKey) {
        console.warn("Gemini API Key tidak ditemui dalam process.env.API_KEY");
        return "Fungsi AI tidak aktif. Sila konfigurasi API Key dalam persekitaran anda.";
    }

    // 3. Inisialisasi SDK HANYA bila diperlukan (Lazy Init)
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const prompt = `
      Bertindak sebagai penganalisis data kewangan kanan.
      Analisis data berikut berkaitan dengan "${context}".
      Berikan ringkasan eksekutif pendek, kenal pasti trend utama, dan berikan 3 cadangan strategik untuk penambahbaikan prestasi.
      Gunakan Bahasa Melayu yang profesional.
      ${mode === 'deep' ? 'Sila gunakan pemikiran mendalam (Thinking Mode) untuk menganalisis corak tersembunyi, risiko, dan peluang jangka panjang data ini secara kritikal.' : ''}
      
      Data:
      ${JSON.stringify(data, null, 2)}
    `;

    let model = 'gemini-2.5-flash';
    let config: any = {};

    if (mode === 'deep') {
      model = 'gemini-3-pro-preview';
      config = {
        thinkingConfig: { thinkingBudget: 32768 }
      };
    }

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config
    });

    return response.text || "Tiada respons dihasilkan.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return `Maaf, analisis tidak dapat dijana. Ralat: ${error.message || 'Unknown error'}`;
  }
};