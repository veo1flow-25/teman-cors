
import { createClient } from '@supabase/supabase-js';

// --- ARAHAN KONFIGURASI SUPABASE ---
// Kunci API projek TEMAN C.O.R.S
const SUPABASE_URL: string = 'https://ujxopuyhfbsdfyhgzjnn.supabase.co';
const SUPABASE_ANON_KEY: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqeG9wdXloZmJzZGZ5aGd6am5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA5OTksImV4cCI6MjA4MDMxNjk5OX0.5UNYF8l9HN6rlJdXOc3IX3wmk4WLd8WzmizX1-O0qlU';

// Inisialisasi Klien
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Semak status konfigurasi
// Kita anggap ia dikonfigurasi jika URL dan KEY tidak kosong dan bukan string placeholder generic
export const isConfigured = 
    !!SUPABASE_URL && 
    SUPABASE_URL !== '' && 
    SUPABASE_URL !== 'MASUKKAN_SUPABASE_URL_DI_SINI' &&
    !!SUPABASE_ANON_KEY && 
    SUPABASE_ANON_KEY !== '' &&
    SUPABASE_ANON_KEY !== 'MASUKKAN_ANON_KEY_DI_SINI';

if (!isConfigured) {
  console.warn("⚠️ SISTEM BERJALAN DALAM MOD DEMO (LOCAL STORAGE) ⚠️");
  console.info("Sila kemaskini fail 'services/supabaseClient.ts' dengan kunci Supabase anda untuk mengaktifkan database sebenar.");
} else {
  console.log("✅ Sambungan Supabase Diaktifkan");
}
