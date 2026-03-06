import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import { queryAll, queryOne, runQuery, logSync } from '../database.js';
import { pushToCloud, deleteFromCloud } from '../supabase.js';

const router = Router();

// GET /api/users
router.get('/', (req, res) => {
    res.json(queryAll('SELECT id, name, instrument, role, avatar_color, created_at FROM users ORDER BY name'));
});

// GET /api/users/:id
router.get('/:id', (req, res) => {
    const user = queryOne('SELECT id, name, instrument, role, avatar_color, created_at FROM users WHERE id = ?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
});

// POST /api/users
router.post('/', (req, res) => {
    const { name, instrument, role, avatar_color } = req.body;
    const id = uuid();
    runQuery('INSERT INTO users (id, name, instrument, role, avatar_color) VALUES (?,?,?,?,?)',
        [id, name, instrument || '', role || 'musician', avatar_color || '#6366f1']);
    const user = queryOne('SELECT id, name, instrument, role, avatar_color FROM users WHERE id = ?', [id]);
    logSync('users', id, 'insert', user);
    res.status(201).json(user);

    // Sync to Cloud
    pushToCloud('users', user);
});

// PUT /api/users/:id
router.put('/:id', (req, res) => {
    const existing = queryOne('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const { name, instrument, role, avatar_color } = req.body;
    runQuery(`UPDATE users SET name=?, instrument=?, role=?, avatar_color=?, updated_at=datetime('now') WHERE id=?`,
        [name ?? existing.name, instrument ?? existing.instrument, role ?? existing.role, avatar_color ?? existing.avatar_color, req.params.id]);
    const updated = queryOne('SELECT id, name, instrument, role, avatar_color FROM users WHERE id = ?', [req.params.id]);
    logSync('users', req.params.id, 'update', updated);
    res.json(updated);

    // Sync to Cloud
    pushToCloud('users', updated);
});

// DELETE /api/users/:id
router.delete('/:id', (req, res) => {
    runQuery('DELETE FROM users WHERE id = ?', [req.params.id]);
    logSync('users', req.params.id, 'delete');
    res.json({ success: true });

    // Sync to Cloud
    deleteFromCloud('users', req.params.id);
});

// GET /api/settings
router.get('/settings/all', (req, res) => {
    const rows = queryAll('SELECT * FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = JSON.parse(r.value); });
    res.json(settings);
});

// PUT /api/settings/:key
router.put('/settings/:key', (req, res) => {
    runQuery('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [req.params.key, JSON.stringify(req.body.value)]);
    logSync('settings', req.params.key, 'update', { value: req.body.value });
    res.json({ success: true });
});

export default router;
