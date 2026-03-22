const SUPABASE_URL = 'https://xjiqsgmgxepqzcxjzhwt.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hlpmoqSi6OjOLzLZSeRm4Q_D2Y7ajpt';

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

    async syncToCloud(dbArray) {
        if (!supabaseClient) return;
        const icon = document.getElementById('sync-status');
        if (icon) icon.classList.add('syncing');
        
        try {
            const blob = new Blob([dbArray], { type: 'application/octet-stream' });
            const { error } = await supabaseClient.storage
                .from('namaz-backups')
                .upload('latest-backup.sqlite', blob, { upsert: true });

            if (error) throw error;
            console.log("Cloud sync successful.");
        } catch (err) {
            console.warn("Cloud sync skipped:", err.message || err);
        } finally {
            if (icon) icon.classList.remove('syncing');
        }
    },

    async pullFromCloud() {
        if (!supabaseClient) return null;
        try {
            const { data, error } = await supabaseClient.storage
                .from('namaz-backups')
                .download('latest-backup.sqlite');
            if (error) throw error;
            return new Uint8Array(await data.arrayBuffer());
        } catch (err) {
            console.warn("Cloud pull skipped:", err.message || err);
            return null;
        }
    }
};

window.NamazSync = Sync;
