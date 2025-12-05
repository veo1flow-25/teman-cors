import { createClient } from '@supabase/supabase-js';

// Access environment variables safely, bypassing missing type definitions for import.meta.env
const env = (import.meta as any).env || {};

// Menggunakan Environment Variables dari Vite (Netlify), atau fallback ke nilai hardcoded
const SUPABASE_URL = env.VITE_SUPABASE_URL || 'https://ujxopuyhfbsdfyhgzjnn.supabase.co';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeG9wdXloZmJzZGZ5aGd6am5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA5OTksImV4cCI6MjA4MDMxNjk5OX0.5UNYF8l9HN6rlJdXOc3IX3wmk4WLd8WzmizX1-O0qlU';

// Inisialisasi Klien
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Semak status konfigurasi
export const isConfigured = 
    !!SUPABASE_URL && 
    SUPABASE_URL !== '' && 
    SUPABASE_URL !== 'MASUKKAN_SUPABASE_URL_DI_SINI' &&
    !!SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY !== '' &&
    SUPABASE_ANON_KEY !== 'MASUKKAN_ANON_KEY_DI_SINI';

if (!isConfigured) {
  console.warn("⚠️ SISTEM BERJALAN DALAM MOD DEMO (LOCAL STORAGE) ⚠️");
} else {
  console.log("✅ Sambungan Supabase Diaktifkan");
}