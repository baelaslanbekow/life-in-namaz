const SUPABASE_URL = 'https://xjiqsgmgxepqzcxjzhwt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqaXFzZ21neGVwcXpjeGp6aHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxNDMzNDIsImV4cCI6MjA4OTcxOTM0Mn0.cgzB829xyrZqTc8pUIWYoEcASr7zDr--aKB5g7dqcN8';

let supabaseClient = null;
try {
    if (window.supabase && window.supabase.createClient) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }
} catch(e) {
    console.warn("Supabase SDK not loaded, running offline.", e);
}

const Sync = {
    isTrusted() {
        return localStorage.getItem('device_trusted') === 'yes';
    },

    setTrusted(trusted) {
        if (trusted) localStorage.setItem('device_trusted', 'yes');
    },

    async verifyPassword(input) {
        if (!input) return false;
        return input.toLowerCase() === 'lovebael';
    },

    // Pull ALL prayers from the cloud database
    async pullAllPrayers() {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient
                .from('prayers')
                .select('year, month, day, type_idx, completed');
            if (error) throw error;
            return data; // Array of {year, month, day, type_idx, completed}
        } catch (err) {
            console.warn("Cloud pull skipped:", err.message || err);
            return null;
        }
    },

    // Push a single prayer toggle to the cloud
    async pushPrayer(year, month, day, type_idx, completed) {
        if (!supabaseClient) return;
        try {
            const { error } = await supabaseClient
                .from('prayers')
                .upsert(
                    { year, month, day, type_idx, completed },
                    { onConflict: 'year,month,day,type_idx' }
                );
            if (error) throw error;
        } catch (err) {
            console.warn("Cloud push skipped:", err.message || err);
        }
    },

    // Push all prayers for a given month to the cloud
    async pushMonth(year, month, prayers) {
        if (!supabaseClient) return;
        const icon = document.getElementById('sync-status');
        if (icon) icon.classList.add('syncing');
        try {
            const { error } = await supabaseClient
                .from('prayers')
                .upsert(prayers, { onConflict: 'year,month,day,type_idx' });
            if (error) throw error;
        } catch (err) {
            console.warn("Bulk cloud push skipped:", err.message || err);
        } finally {
            if (icon) icon.classList.remove('syncing');
        }
    }
};

window.NamazSync = Sync;
