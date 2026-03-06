import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getLanIp } from './utils/network.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Only initialize if keys are present
export const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

console.log('☁️ Supabase Client Initialized:', !!supabase);

/**
 * Generic function to push data to Supabase
 */
export const pushToCloud = async (table, data) => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from(table)
            .upsert([data], { onConflict: 'id' });

        if (error) throw error;
        console.log(`☁️ Cloud Sync: Record in '${table}' pushed to Supabase`);
    } catch (err) {
        console.error(`❌ Cloud Sync Error (Push ${table}):`, err.message);
    }
};

/**
 * Generic function to delete data from Supabase
 */
export const deleteFromCloud = async (table, id) => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
        console.log(`☁️ Cloud Sync: ID '${id}' deleted from '${table}' in Supabase`);
    } catch (err) {
        console.error(`❌ Cloud Sync Error (Delete ${table}):`, err.message);
    }
};

// Aliases for backward compatibility
export const pushSongToCloud = (data) => pushToCloud('songs', data);
export const deleteSongFromCloud = (id) => deleteFromCloud('songs', id);

/**
 * Pushes ONLY the LAN IP to the cloud so mobile devices can find the PC.
 * Song data and slides are NOT sent to the cloud for privacy and data efficiency.
 */
export const pushLiveState = async () => {
    if (!supabase) return;
    try {
        const lanIp = getLanIp();
        const { error } = await supabase
            .from('live_state')
            .upsert([{
                id: 'default',
                lan_ip: lanIp,
                updated_at: new Date().toISOString()
            }], { onConflict: 'id' });

        if (error) throw error;
        console.log('📡 LAN IP broadcasted to Supabase for local discovery');
    } catch (err) {
        console.error('❌ Cloud Live Bridge Error (LAN IP):', err.message);
    }
};
/**
 * Clears the LAN IP from Supabase when the server shuts down.
 */
export const clearLiveState = async () => {
    if (!supabase) return;
    try {
        const { error } = await supabase
            .from('live_state')
            .update({ lan_ip: null, updated_at: new Date().toISOString() })
            .eq('id', 'default');

        if (error) throw error;
        console.log('🧹 LAN IP cleared from Supabase (Server Shutdown)');
    } catch (err) {
        console.error('❌ Cloud Live Bridge Error (Clear IP):', err.message);
    }
};
