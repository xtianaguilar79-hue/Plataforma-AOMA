//=====================================================
// AOMA - Plataforma de Capacitación
// config.js
//=====================================================

// URL del proyecto Supabase
const SUPABASE_URL = "https://kkgrqgdddizrmspsmqzy.supabase.co";

// Clave pública (ANON KEY)
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtrZ3JxZ2RkZGl6cm1zcHNtcXp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5ODg0NjQsImV4cCI6MjA5OTU2NDQ2NH0.AhCJIA9toBoT5scduaCTR3ib-zFY71EV85eH65SPbys";

// Crear cliente de Supabase
const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);