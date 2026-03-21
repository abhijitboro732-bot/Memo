// Replace these with your actual Supabase Project URL and Anon Key
const SUPABASE_URL = 'https://sctwznmwlfasvdzwgokd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_VOzNnGpHgTbHkr5_AcGoVg_Ghbe39s-';

// Initialize Supabase client
// Make sure <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> is loaded before this script.
window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper function to check if the user needs to configure keys
function checkSupabaseConfig() {
    if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error("Supabase configuration missing!");
        alert("Please configure your SUPABASE_URL and SUPABASE_ANON_KEY in supabaseClient.js to make the app functional.");
        return false;
    }
    return true;
}

// Ensure the config is checked when this script runs
document.addEventListener('DOMContentLoaded', checkSupabaseConfig);
