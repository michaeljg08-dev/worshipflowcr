import { Router } from 'express';
import multer from 'multer';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join, extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { queryAll, queryOne, runQuery } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const UPLOAD_DIR = join(__dirname, '..', '..', 'data', 'uploads');

if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = extname(file.originalname);
        cb(null, `${uuid()}${ext}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|svg|mp4|webm|mov)$/i;
        if (allowed.test(extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('File type not supported'));
        }
    }
});

const router = Router();

// GET /api/media
router.get('/', (req, res) => {
    const { type } = req.query;
    let sql = 'SELECT * FROM media';
    const params = [];
    if (type) { sql += ' WHERE file_type = ?'; params.push(type); }
    sql += ' ORDER BY created_at DESC';
    res.json(queryAll(sql, params));
});

// POST /api/media/upload
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const id = uuid();
    const fileType = req.body.file_type || 'image';
    runQuery(
        'INSERT INTO media (id, filename, original_name, mime_type, file_type, path, size) VALUES (?,?,?,?,?,?,?)',
        [id, req.file.filename, req.file.originalname, req.file.mimetype, fileType, `/uploads/${req.file.filename}`, req.file.size]
    );

    const media = queryOne('SELECT * FROM media WHERE id = ?', [id]);
    res.status(201).json(media);
});

// DELETE /api/media/:id
router.delete('/:id', (req, res) => {
    runQuery('DELETE FROM media WHERE id = ?', [req.params.id]);
    res.json({ success: true });
});

export default router;
