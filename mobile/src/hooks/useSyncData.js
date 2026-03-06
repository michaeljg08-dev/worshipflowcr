import { useState, useEffect } from 'react';
import { syncManager } from '../utils/SyncManager';

export function useSyncData(table, id = null, options = {}) {
    const resolve = (tbl, id) => {
        if (tbl === 'events') return syncManager.getResolvedEvent(id);
        if (tbl === 'playlists') return syncManager.getResolvedPlaylist(id);
        return null;
    };

    const [isSyncing, setIsSyncing] = useState(syncManager.isSyncing);
    const [data, setData] = useState(() => {
        if (!id) return syncManager.list(table);
        return options.resolved ? resolve(table, id) : syncManager.get(table, id);
    });

    useEffect(() => {
        // Update local state in case it changed before effects ran
        setIsSyncing(syncManager.isSyncing);

        // Fetch immediately since ID or table might have changed (useState init only runs once)
        if (id) {
            setData(options.resolved ? resolve(table, id) : syncManager.get(table, id));
        } else {
            setData(syncManager.list(table));
        }

        const unsubscribe = syncManager.subscribe((cache) => {
            setIsSyncing(syncManager.isSyncing);
            if (id) {
                setData(options.resolved ? resolve(table, id) : cache[table]?.[id] || null);
            } else {
                setData(Object.values(cache[table] || {}));
            }
        });

        return unsubscribe;
    }, [table, id]);

    return {
        data,
        isSyncing,
        sync: () => syncManager.sync()
    };
}
