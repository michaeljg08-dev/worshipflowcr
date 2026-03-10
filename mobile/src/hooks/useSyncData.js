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
        if (id !== undefined && id !== null) {
            return options.resolved ? resolve(table, id) : syncManager.get(table, id);
        }
        return syncManager.list(table);
    });

    useEffect(() => {
        // Update local state in case it changed before effects ran
        setIsSyncing(syncManager.isSyncing);

        // Fetch immediately since ID or table might have changed (useState init only runs once)
        if (id !== undefined && id !== null) {
            setData(options.resolved ? resolve(table, id) : syncManager.get(table, id));
        } else {
            setData(syncManager.list(table));
        }

        const unsubscribe = syncManager.subscribe((cache) => {
            setIsSyncing(syncManager.isSyncing);
            if (id !== undefined && id !== null) {
                const newData = options.resolved ? resolve(table, id) : cache[table]?.[id] || null;
                // Simple equality check to avoid redundant state updates
                setData(prev => JSON.stringify(prev) === JSON.stringify(newData) ? prev : newData);
            } else {
                const newList = cache[table] ? Object.values(cache[table]) : [];
                setData(prev => JSON.stringify(prev) === JSON.stringify(newList) ? prev : newList);
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
