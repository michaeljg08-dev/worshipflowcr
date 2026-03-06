import { Router } from 'express';
import { queryAll, queryOne, runQuery } from '../database.js';
import { pushToCloud } from '../supabase.js';
const router = Router();

/**
 * GET /api/sync/changes
 * Query params:
 *  - since: ISO Timestamp (default: 1970-01-01)
 *  - limit: max changes to return (default: 1000)
 */
router.get('/changes', (req, res) => {
    let since = req.query.since || '1970-01-01 00:00:00';
    if (since.includes('T')) {
        since = since.replace('T', ' ').substring(0, 19);
    }
    const limit = parseInt(req.query.limit) || 1000;

    if (since === '1970-01-01 00:00:00') {
        const changes = [];
        const push = (t, a, r) => changes.push({ table_name: t, record_id: r.id, action: a, data: JSON.stringify(r), created_at: r.updated_at || r.created_at || new Date().toISOString().replace('T', ' ').substring(0, 19) });

        queryAll('SELECT * FROM users').forEach(r => push('users', 'insert', r));
        queryAll('SELECT * FROM playlists').forEach(r => push('playlists', 'insert', r));
        queryAll('SELECT * FROM playlist_songs').forEach(r => push('playlist_songs', 'insert', r));
        queryAll('SELECT * FROM events').forEach(r => push('events', 'insert', r));
        queryAll('SELECT * FROM event_attendance').forEach(r => push('event_attendance', 'insert', r));
        queryAll('SELECT * FROM comments').forEach(r => push('comments', 'insert', r));

        const songs = queryAll('SELECT * FROM songs');
        const sections = queryAll('SELECT * FROM song_sections ORDER BY sort_order');
        songs.forEach(s => {
            s.tags = JSON.parse(s.tags || '[]');
            s.sections = sections.filter(sec => sec.song_id === s.id).map(sec => ({
                ...sec, chords: JSON.parse(sec.chords || '[]')
            }));
            push('songs', 'insert', s);
        });

        return res.json({
            changes,
            serverTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });
    }

    const changes = queryAll(`
        SELECT * FROM sync_queue 
        WHERE created_at > ? 
        ORDER BY created_at ASC 
        LIMIT ?
    `, [since, limit]);

    let serverTime = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (changes.length > 0) {
        serverTime = changes[changes.length - 1].created_at;
    }

    res.json({
        changes,
        serverTime
    });
});

/**
 * GET /api/sync/status
 * Returns current server time and total pending changes 
 * (useful for checking if sync is needed)
 */
router.get('/status', (req, res) => {
    const total = queryOne('SELECT COUNT(*) as count FROM sync_queue');
    res.json({
        serverTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
        totalChanges: total?.count || 0
    });
});

export default router;
