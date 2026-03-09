import { api, wsOn } from '../api';
import { supabase } from './supabase';

const CACHE_VERSION = 'v2_chordpro_support';

class SyncManager {
    constructor() {
        this.cacheVersion = CACHE_VERSION;
        this.lastSync = '1970-01-01 00:00:00';
        this.cache = { "songs": {}, "events": {}, "playlists": {}, "users": {} };
        this.isSyncing = false;
        this.listeners = [];
        this.initialized = false;

        this.load();
    }

    load() {
        try {
            const storedVersion = localStorage.getItem('sync_version');
            // Hard rule: only clear if we HAVE a stored version and it's DIFFERENT from current.
            // If stored is missing, we just initialize it.
            if (storedVersion && storedVersion !== this.cacheVersion) {
                console.log(`⚠️ Cache version mismatch (${storedVersion} vs ${this.cacheVersion}). Clearing...`);
                this.clear();
                return;
            }
            if (!storedVersion) {
                localStorage.setItem('sync_version', this.cacheVersion);
            }

            this.lastSync = localStorage.getItem('lastSync') || '1970-01-01 00:00:00';
            const storedCache = localStorage.getItem('sync_cache');
            if (storedCache) {
                this.cache = JSON.parse(storedCache);
            }
        } catch (e) {
            console.error('❌ Failed to load sync cache:', e);
            this.clear();
        }
    }

    clear() {
        localStorage.removeItem('sync_cache');
        localStorage.setItem('lastSync', '1970-01-01 00:00:00');
        localStorage.setItem('sync_version', this.cacheVersion);
        this.lastSync = '1970-01-01 00:00:00';
        this.cache = { "songs": {}, "events": {}, "playlists": {}, "users": {} };
        this.save();
    }

    async sync() {
        if (this.isSyncing) return;
        this.isSyncing = true;
        console.log('🔄 Syncing started since:', this.lastSync);

        try {
            // Attempt Local LAN Sync first
            // Ensure we use the API wrapper which handles the dynamic base URL
            const res = await api.sync.changes(this.lastSync);

            if (res && res.changes) {
                if (res.changes.length > 0) {
                    this.applyChanges(res.changes);
                }
                this.lastSync = res.serverTime || new Date().toISOString();

                // Only update version if the server explicitly provides one
                if (res.sync_version && res.sync_version !== this.cacheVersion) {
                    console.log(`✨ Server requested version update: ${res.sync_version}`);
                    this.cacheVersion = res.sync_version;
                    localStorage.setItem('sync_version', this.cacheVersion);
                }

                this.save();
                this.notify();
            }
            console.log('✅ Local Sync completed. Records:', res?.changes?.length || 0);
        } catch (err) {
            console.warn('⚠️ Local Sync failed, attempting Cloud Fallback (Supabase)...', err.message);

            // If the local network is unreachable (User is at home), query Supabase
            if (supabase) {
                try {
                    console.log('☁️ Attempting full Cloud Fallback (Songs, Playlists, Events)...');

                    const tables = ['songs', 'playlists', 'playlist_songs', 'events', 'event_attendance', 'comments', 'users'];
                    const promises = tables.map(table =>
                        Promise.race([
                            supabase.from(table).select('*'),
                            new Promise((_, reject) => setTimeout(() => reject(new Error(`${table} timeout`)), 10000))
                        ])
                    );

                    const results = await Promise.all(promises);

                    results.forEach((res, idx) => {
                        const table = tables[idx];
                        if (res.error) {
                            console.error(`❌ Cloud Sync error for ${table}:`, res.error.message);
                            return;
                        }

                        // Treat Cloud as Source of Truth: Overwrite the table cache
                        // This removes "ghost" data that exists locally but not in Supabase
                        this.cache[table] = {};
                        if (res.data && res.data.length > 0) {
                            res.data.forEach(item => {
                                this.cache[table][item.id] = { ...item };
                            });
                        }
                    });

                    this.save();
                    console.log('☁️ Cloud Sync (full pull) completed.');
                } catch (cloudErr) {
                    console.error('❌ Cloud Sync failed:', cloudErr.message);
                }
            }
        } finally {
            this.isSyncing = false;
            console.log('🏁 Sync sequence finished.');
            // We only notify here if we might have changed isSyncing state, 
            // but we should be careful not to trigger infinite loops.
            // Component should only re-render if data actually changed.
            this.notify();
        }
    }

    applyChanges(changes) {
        changes.forEach(change => {
            const { table_name, record_id, action, data } = change;
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;

            if (!this.cache[table_name]) this.cache[table_name] = {};

            if (action === 'delete') {
                delete this.cache[table_name][record_id];
            } else {
                // insert or update
                this.cache[table_name][record_id] = {
                    ...this.cache[table_name][record_id],
                    ...parsedData,
                    id: record_id // ensure ID is present
                };
            }
        });
    }

    save() {
        localStorage.setItem('lastSync', this.lastSync);
        localStorage.setItem('sync_cache', JSON.stringify(this.cache));
    }

    // Helper to get cached data
    get(table, id) {
        return this.cache[table]?.[id] || null;
    }

    getResolvedEvent(eventId) {
        const event = this.get('events', eventId);
        if (!event) return null;

        const resolved = { ...event };
        if (event.playlist_id) {
            resolved.playlist = this.getResolvedPlaylist(event.playlist_id);
        }
        return resolved;
    }

    getResolvedPlaylist(playlistId) {
        const playlist = this.get('playlists', playlistId);
        if (!playlist) return null;

        const resolved = { ...playlist };
        const entries = this.list('playlist_songs')
            .filter(ps => ps.playlist_id === playlistId)
            .sort((a, b) => a.sort_order - b.sort_order);

        resolved.songs = entries.map(ps => {
            const rawSong = this.get('songs', ps.song_id) || {};
            // We want `ps.id` to be the primary key (the entry id), but we need the song's meta
            return {
                ...rawSong, // Base song metadata
                ...ps,      // Playlist_songs overrides (id, sort_order, custom_key, notes)
                song_id: ps.song_id // Ensure song tracking
            };
        });

        return resolved;
    }

    list(table) {
        return Object.values(this.cache[table] || {});
    }

    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    notify() {
        this.listeners.forEach(l => l(this.cache));
    }

    init() {
        if (this.initialized) return;
        this.initialized = true;

        console.log('🚀 SyncManager initialized.');
        // Initial sync
        this.sync();

        // Listen for real-time updates to trigger sync
        const triggerSync = () => {
            if (this.isSyncing) return;
            this.sync();
        };
        wsOn('sync:update', triggerSync);

        // Listen to specific database entities
        wsOn('event:created', triggerSync);
        wsOn('event:updated', triggerSync);
        wsOn('event:deleted', triggerSync);
        wsOn('event:attendance', triggerSync);
        wsOn('event:comment', triggerSync);

        wsOn('playlist:created', triggerSync);
        wsOn('playlist:updated', triggerSync);
        wsOn('playlist:deleted', triggerSync);

        wsOn('song:created', triggerSync);
        wsOn('song:updated', triggerSync);
        wsOn('song:deleted', triggerSync);

        wsOn('user:created', triggerSync);
        wsOn('user:updated', triggerSync);
        wsOn('user:deleted', triggerSync);

        // Also periodic fallback
        setInterval(triggerSync, 30000);
    }
}

export const syncManager = new SyncManager();
