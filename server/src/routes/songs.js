import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, runQuery, logSync } from '../database.js';
import { broadcast } from '../websocket.js';
import { pushSongToCloud, deleteSongFromCloud } from '../supabase.js';

const router = Router();

// GET /api/songs — List all songs (with optional search)
router.get('/', (req, res) => {
    const { search, category, key } = req.query;
    let sql = `SELECT s.*, 
    (SELECT COUNT(*) FROM song_sections WHERE song_id = s.id) as section_count
    FROM songs s WHERE 1=1`;
    const params = [];

    if (search) {
        sql += ` AND (s.title LIKE ? OR s.author LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
    }
    if (category) {
        sql += ` AND s.category = ?`;
        params.push(category);
    }
    if (key) {
        sql += ` AND s.song_key = ?`;
        params.push(key);
    }

    sql += ` ORDER BY s.updated_at DESC`;
    const songs = queryAll(sql, params);
    res.json(songs.map(s => ({ ...s, chordpro: s.chordpro || '' })));
});

// GET /api/songs/:id — Get song with all sections
router.get('/:id', (req, res) => {
    const song = queryOne('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const sections = queryAll(
        'SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order',
        [req.params.id]
    );

    song.sections = sections.map(s => ({
        ...s,
        chords: JSON.parse(s.chords || '[]')
    }));
    song.tags = JSON.parse(song.tags || '[]');
    song.chordpro = song.chordpro || '';

    res.json(song);
});

// POST /api/songs — Create song
router.post('/', (req, res) => {
    const { title, author, song_key, bpm, time_signature, category, tags, notes, chordpro } = req.body;
    const id = uuid();

    runQuery(
        `INSERT INTO songs (id, title, author, song_key, bpm, time_signature, category, tags, notes, chordpro)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, title, author || '', song_key || 'C', bpm || 120, time_signature || '4/4', category || '', JSON.stringify(tags || []), notes || '', chordpro || '']
    );

    const song = queryOne('SELECT * FROM songs WHERE id = ?', [id]);
    song.tags = JSON.parse(song.tags || '[]');
    song.chordpro = song.chordpro || '';
    song.sections = queryAll('SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order', [id]).map(s => ({
        ...s, chords: JSON.parse(s.chords || '[]')
    }));
    logSync('songs', id, 'insert', song);
    broadcast('song:created', song);
    res.status(201).json(song);

    // Asynchronously push to Cloud Hybrid Sync
    pushSongToCloud({
        id: song.id,
        title: song.title,
        author: song.author,
        song_key: song.song_key,
        bpm: song.bpm,
        time_signature: song.time_signature,
        chordpro: song.chordpro,
        tags: JSON.stringify(song.tags),
        youtube_url: song.youtube_url,
        spotify_url: song.spotify_url,
        created_at: song.created_at,
        updated_at: song.updated_at
    });
});

// PUT /api/songs/:id — Update song
router.put('/:id', (req, res) => {
    const existing = queryOne('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Song not found' });

    const { title, author, song_key, bpm, time_signature, category, tags, notes, chordpro } = req.body;

    runQuery(
        `UPDATE songs SET title=?, author=?, song_key=?, bpm=?, time_signature=?, category=?, tags=?, notes=?, chordpro=?, updated_at=datetime('now')
     WHERE id = ?`,
        [
            title ?? existing.title, author ?? existing.author, song_key ?? existing.song_key,
            bpm ?? existing.bpm, time_signature ?? existing.time_signature, category ?? existing.category,
            JSON.stringify(tags || JSON.parse(existing.tags || '[]')), notes ?? existing.notes,
            chordpro ?? existing.chordpro, req.params.id
        ]
    );

    const updated = queryOne('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    updated.tags = JSON.parse(updated.tags || '[]');
    updated.chordpro = updated.chordpro || '';
    updated.sections = queryAll('SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order', [req.params.id]).map(s => ({
        ...s, chords: JSON.parse(s.chords || '[]')
    }));
    logSync('songs', req.params.id, 'update', updated);
    broadcast('song:updated', updated);
    res.json(updated);

    // Asynchronously push to Cloud Hybrid Sync
    pushSongToCloud({
        id: updated.id,
        title: updated.title,
        author: updated.author,
        song_key: updated.song_key,
        bpm: updated.bpm,
        time_signature: updated.time_signature,
        chordpro: updated.chordpro,
        tags: JSON.stringify(updated.tags),
        youtube_url: updated.youtube_url,
        spotify_url: updated.spotify_url,
        created_at: updated.created_at,
        updated_at: updated.updated_at
    });
});

// DELETE /api/songs/:id
router.delete('/:id', (req, res) => {
    const existing = queryOne('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Song not found' });

    runQuery('DELETE FROM songs WHERE id = ?', [req.params.id]);
    logSync('songs', req.params.id, 'delete');
    broadcast('song:deleted', { id: req.params.id });
    res.json({ success: true });

    // Asynchronously update Cloud Hybrid Sync
    deleteSongFromCloud(req.params.id);
});

// POST /api/songs/:id/transpose — Transpose song key
router.post('/:id/transpose', (req, res) => {
    const { semitones } = req.body;
    const song = queryOne('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const currentIndex = NOTES.indexOf(song.song_key.replace('m', ''));
    const isMinor = song.song_key.includes('m');
    const newIndex = (currentIndex + (semitones || 0) + 12) % 12;
    const newKey = NOTES[newIndex] + (isMinor ? 'm' : '');

    // Transpose chords in chordpro string
    const transposedChordpro = song.chordpro ? song.chordpro.replace(/\[([A-G][b#]?m?[0-9]*[a-zA-Z0-9]*)\]/g, (match, c) => {
        const rootMatch = c.match(/^[A-G][b#]?/);
        if (!rootMatch) return match;
        const root = rootMatch[0];
        const suffix = c.substring(root.length);
        const idx = NOTES.indexOf(root);
        if (idx === -1) return match;
        return '[' + NOTES[(idx + (semitones || 0) + 12) % 12] + suffix + ']';
    }) : '';

    runQuery("UPDATE songs SET song_key = ?, chordpro = ?, updated_at = datetime('now') WHERE id = ?", [newKey, transposedChordpro, req.params.id]);

    // Transpose chords in sections (legacy support)
    const sections = queryAll('SELECT * FROM song_sections WHERE song_id = ?', [req.params.id]);
    for (const section of sections) {
        const chords = JSON.parse(section.chords || '[]');
        const transposed = chords.map(c => {
            const root = c.replace(/m|7|maj|dim|aug|sus|add|\d/g, '');
            const suffix = c.replace(root, '');
            const idx = NOTES.indexOf(root);
            if (idx === -1) return c;
            return NOTES[(idx + (semitones || 0) + 12) % 12] + suffix;
        });
        runQuery('UPDATE song_sections SET chords = ? WHERE id = ?', [JSON.stringify(transposed), section.id]);
    }

    const updated = queryOne('SELECT * FROM songs WHERE id = ?', [req.params.id]);
    updated.tags = JSON.parse(updated.tags || '[]');
    updated.sections = queryAll('SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order', [req.params.id]).map(s => ({
        ...s, chords: JSON.parse(s.chords || '[]')
    }));
    logSync('songs', req.params.id, 'update', updated);
    broadcast('song:updated', updated);
    res.json({ newKey, song: updated });

    // Asynchronously push to Cloud Hybrid Sync
    pushSongToCloud({
        id: updated.id,
        title: updated.title,
        author: updated.author,
        song_key: updated.song_key,
        bpm: updated.bpm,
        time_signature: updated.time_signature,
        chordpro: updated.chordpro,
        tags: JSON.stringify(updated.tags),
        youtube_url: updated.youtube_url,
        spotify_url: updated.spotify_url,
        created_at: updated.created_at,
        updated_at: updated.updated_at
    });
});

export default router;
