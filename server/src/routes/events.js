import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, runQuery, logSync } from '../database.js';
import { broadcast } from '../websocket.js';
import { pushToCloud, deleteFromCloud } from '../supabase.js';

const router = Router();

// GET /api/events — List events (optionally filter by date range)
router.get('/', (req, res) => {
    const { from, to, type } = req.query;
    let sql = 'SELECT e.*, p.name as playlist_name FROM events e LEFT JOIN playlists p ON p.id = e.playlist_id WHERE 1=1';
    const params = [];

    if (from) { sql += ' AND e.date >= ?'; params.push(from); }
    if (to) { sql += ' AND e.date <= ?'; params.push(to); }
    if (type) { sql += ' AND e.event_type = ?'; params.push(type); }

    sql += ' ORDER BY e.date ASC, e.time ASC';
    res.json(queryAll(sql, params));
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
    const event = queryOne(`
    SELECT e.*, p.name as playlist_name 
    FROM events e LEFT JOIN playlists p ON p.id = e.playlist_id 
    WHERE e.id = ?
  `, [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    event.attendance = queryAll(`
    SELECT ea.*, u.name as user_name, u.instrument
    FROM event_attendance ea JOIN users u ON u.id = ea.user_id
    WHERE ea.event_id = ?
  `, [req.params.id]);

    event.comments = queryAll(`
    SELECT c.*, u.name as user_name
    FROM comments c JOIN users u ON u.id = c.user_id
    WHERE c.event_id = ?
    ORDER BY c.created_at DESC
  `, [req.params.id]);

    if (event.playlist_id) {
        event.playlist = queryOne('SELECT * FROM playlists WHERE id = ?', [event.playlist_id]);
        if (event.playlist) {
            event.playlist.songs = queryAll(`
                SELECT ps.*, s.title, s.author, s.song_key, s.bpm
                FROM playlist_songs ps
                JOIN songs s ON s.id = ps.song_id
                WHERE ps.playlist_id = ?
                ORDER BY ps.sort_order ASC
            `, [event.playlist_id]);
        }
    }

    res.json(event);
});

// POST /api/events
router.post('/', (req, res) => {
    const { title, date, time, end_time, playlist_id, event_type, notes } = req.body;
    const id = uuid();
    runQuery(
        'INSERT INTO events (id, title, date, time, end_time, playlist_id, event_type, notes) VALUES (?,?,?,?,?,?,?,?)',
        [id, title, date, time || '', end_time || '', playlist_id || '', event_type || 'service', notes || '']
    );
    const event = queryOne('SELECT * FROM events WHERE id = ?', [id]);
    logSync('events', id, 'insert', event);
    broadcast('event:created', event);
    res.status(201).json(event);

    // Sync to Cloud
    pushToCloud('events', event);
});

// PUT /api/events/:id
router.put('/:id', (req, res) => {
    const existing = queryOne('SELECT * FROM events WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Event not found' });

    const { title, date, time, end_time, playlist_id, event_type, notes } = req.body;
    runQuery(
        `UPDATE events SET title=?, date=?, time=?, end_time=?, playlist_id=?, event_type=?, notes=?, updated_at=datetime('now') WHERE id=?`,
        [title ?? existing.title, date ?? existing.date, time ?? existing.time, end_time ?? existing.end_time,
        playlist_id ?? existing.playlist_id, event_type ?? existing.event_type, notes ?? existing.notes, req.params.id]
    );
    const updated = queryOne('SELECT * FROM events WHERE id = ?', [req.params.id]);
    logSync('events', req.params.id, 'update', updated);
    broadcast('event:updated', updated);
    res.json(updated);

    // Sync to Cloud
    pushToCloud('events', updated);
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
    runQuery('DELETE FROM events WHERE id = ?', [req.params.id]);
    logSync('events', req.params.id, 'delete');
    broadcast('event:deleted', { id: req.params.id });
    res.json({ success: true });

    // Sync to Cloud
    deleteFromCloud('events', req.params.id);
});

// POST /api/events/:id/attend
router.post('/:id/attend', (req, res) => {
    const { user_id, status } = req.body;
    const id = uuid();
    runQuery(
        `INSERT INTO event_attendance (id, event_id, user_id, status, confirmed_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(event_id, user_id) DO UPDATE SET status=excluded.status, confirmed_at=datetime('now')`,
        [id, req.params.id, user_id, status || 'confirmed']
    );
    logSync('event_attendance', id, 'insert', { event_id: req.params.id, user_id, status });
    broadcast('event:attendance', { event_id: req.params.id, user_id, status });
    res.json({ success: true });

    // Sync to Cloud
    pushToCloud('event_attendance', { id, event_id: req.params.id, user_id, status, confirmed_at: new Date().toISOString() });
});

// POST /api/events/:id/comments
router.post('/:id/comments', (req, res) => {
    const { user_id, text } = req.body;
    const id = uuid();
    runQuery('INSERT INTO comments (id, event_id, user_id, text) VALUES (?,?,?,?)',
        [id, req.params.id, user_id, text]);
    const comment = queryOne('SELECT c.*, u.name as user_name FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?', [id]);
    logSync('comments', id, 'insert', comment);
    broadcast('event:comment', comment);
    res.status(201).json(comment);

    // Sync to Cloud
    pushToCloud('comments', comment);
});

export default router;
