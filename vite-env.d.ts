/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

5. Klik **Commit new file**

---

Lepas buat kedua-dua step, structure patut jadi:
```
teman-cors/
├── vite-env.d.ts     ✅ (di root)
├── package.json
├── services/
│   ├── geminiService.ts
│   └── ... (takde vite-env.d.ts)
