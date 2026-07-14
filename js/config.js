// =========================================
// CAMPUS AOMA
// config.js
// =========================================

// REEMPLAZAR LA ANON KEY POR LA TUYA
const SUPABASE_URL = "https://kkgrqgdddizrmspsmqzy.supabase.co";

const SUPABASE_ANON_KEY =
"PEGA_AQUI_TU_ANON_KEY";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);