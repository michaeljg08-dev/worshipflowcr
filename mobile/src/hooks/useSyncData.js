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
        // If an ID is conditionally passed but currently falsy, return null instead of a full array list
        // to prevent object-spread array corruption in consumers (e.g. {...fullData, ...minimalData})
        if (id === null || id === undefined) return null;

        return options.resolved ? resolve(table, id) : syncManager.get(table, id);
    });

    useEffect(() => {
        // Update local state in case it changed before effects ran
        setIsSyncing(syncManager.isSyncing);

        // Fetch immediately since ID or table might have changed (useState init only runs once)
        if (id !== undefined && id !== null) {
            setData(options.resolved ? resolve(table, id) : syncManager.get(table, id));
        } else {
            setData(null);
        }

        const unsubscribe = syncManager.subscribe((cache) => {
            setIsSyncing(syncManager.isSyncing);
            if (id !== undefined && id !== null) {
                const newData = options.resolved ? resolve(table, id) : cache[table]?.[id] || null;
                // Simple equality check to avoid redundant state updates
                setData(prev => JSON.stringify(prev) === JSON.stringify(newData) ? prev : newData);
            } else {
                setData(null);
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
