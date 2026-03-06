import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, runQuery, logSync } from '../database.js';
import { broadcast } from '../websocket.js';
import { pushToCloud, deleteFromCloud } from '../supabase.js';

const router = Router();

// GET /api/playlists
router.get('/', (req, res) => {
    const playlists = queryAll(`
    SELECT p.*, 
      (SELECT COUNT(*) FROM playlist_songs WHERE playlist_id = p.id) as song_count
    FROM playlists p ORDER BY p.updated_at DESC
  `);
    res.json(playlists);
});

// GET /api/playlists/:id — with songs
router.get('/:id', (req, res) => {
    const playlist = queryOne('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

    const songs = queryAll(`
    SELECT ps.*, s.title, s.author, s.song_key, s.bpm, s.time_signature, s.category
    FROM playlist_songs ps
    JOIN songs s ON s.id = ps.song_id
    WHERE ps.playlist_id = ?
    ORDER BY ps.sort_order
  `, [req.params.id]);

    playlist.songs = songs;
    res.json(playlist);
});

// POST /api/playlists
router.post('/', (req, res) => {
    const { name, description } = req.body;
    const id = uuid();
    runQuery('INSERT INTO playlists (id, name, description) VALUES (?, ?, ?)',
        [id, name, description || '']);
    const playlist = queryOne('SELECT * FROM playlists WHERE id = ?', [id]);
    logSync('playlists', id, 'insert', playlist);
    broadcast('playlist:created', playlist);
    res.status(201).json(playlist);

    // Sync to Cloud
    pushToCloud('playlists', playlist);
});

// PUT /api/playlists/:id
router.put('/:id', (req, res) => {
    const existing = queryOne('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Playlist not found' });

    const { name, description } = req.body;
    runQuery(`UPDATE playlists SET name=?, description=?, updated_at=datetime('now') WHERE id=?`,
        [name ?? existing.name, description ?? existing.description, req.params.id]);

    const updated = queryOne('SELECT * FROM playlists WHERE id = ?', [req.params.id]);
    logSync('playlists', req.params.id, 'update', updated);
    broadcast('playlist:updated', updated);
    res.json(updated);

    // Sync to Cloud
    pushToCloud('playlists', updated);
});

// DELETE /api/playlists/:id
router.delete('/:id', (req, res) => {
    runQuery('DELETE FROM playlists WHERE id = ?', [req.params.id]);
    logSync('playlists', req.params.id, 'delete');
    broadcast('playlist:deleted', { id: req.params.id });
    res.json({ success: true });

    // Sync to Cloud
    deleteFromCloud('playlists', req.params.id);
});

// POST /api/playlists/:id/songs — Add song
router.post('/:id/songs', (req, res) => {
    const { song_id, custom_key, notes } = req.body;
    const maxOrder = queryOne('SELECT MAX(sort_order) as max_order FROM playlist_songs WHERE playlist_id = ?', [req.params.id]);
    const id = uuid();
    runQuery(
        'INSERT INTO playlist_songs (id, playlist_id, song_id, sort_order, custom_key, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [id, req.params.id, song_id, (maxOrder?.max_order ?? -1) + 1, custom_key || '', notes || '']
    );
    runQuery("UPDATE playlists SET updated_at=datetime('now') WHERE id=?", [req.params.id]);

    const newEntry = queryOne('SELECT * FROM playlist_songs WHERE id = ?', [id]);
    logSync('playlist_songs', id, 'insert', newEntry);
    logSync('playlists', req.params.id, 'update', { updated_at: new Date().toISOString() });

    broadcast('playlist:updated', { id: req.params.id });
    res.status(201).json({ id });

    // Sync to Cloud
    pushToCloud('playlist_songs', newEntry);
});

// DELETE /api/playlists/:id/songs/:songEntryId
router.delete('/:id/songs/:entryId', (req, res) => {
    runQuery('DELETE FROM playlist_songs WHERE id = ? AND playlist_id = ?', [req.params.entryId, req.params.id]);
    runQuery("UPDATE playlists SET updated_at=datetime('now') WHERE id=?", [req.params.id]);

    logSync('playlist_songs', req.params.entryId, 'delete');
    logSync('playlists', req.params.id, 'update', { updated_at: new Date().toISOString() });

    broadcast('playlist:updated', { id: req.params.id });
    res.json({ success: true });

    // Sync to Cloud
    deleteFromCloud('playlist_songs', req.params.entryId);
});

// PUT /api/playlists/:id/reorder
router.put('/:id/reorder', (req, res) => {
    const { order } = req.body; // Array of entry IDs in new order
    if (order && Array.isArray(order)) {
        for (let i = 0; i < order.length; i++) {
            runQuery('UPDATE playlist_songs SET sort_order = ? WHERE id = ?', [i, order[i]]);
        }
    }
    runQuery("UPDATE playlists SET updated_at=datetime('now') WHERE id=?", [req.params.id]);

    // For reorder, we log multiple updates or a single sync event?
    // Let's log 'reorder' as a custom action or just many updates. 
    // Atomic updates are better for LWW.
    for (let i = 0; i < order.length; i++) {
        logSync('playlist_songs', order[i], 'update', { sort_order: i });
    }
    logSync('playlists', req.params.id, 'update', { updated_at: new Date().toISOString() });

    broadcast('playlist:updated', { id: req.params.id });
    res.json({ success: true });

    // Sync to Cloud
    if (order && Array.isArray(order)) {
        order.forEach((id, i) => {
            const entry = queryOne('SELECT * FROM playlist_songs WHERE id = ?', [id]);
            if (entry) pushToCloud('playlist_songs', entry);
        });
    }
});

export default router;
