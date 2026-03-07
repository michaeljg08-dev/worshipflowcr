import express from 'express';
import { v4 as uuid } from 'uuid';
import { getDb, queryAll, queryOne, runQuery } from '../database.js';

const router = express.Router();

// List all Bibles
router.get('/', (req, res) => {
    try {
        const bibles = queryAll('SELECT * FROM bibles ORDER BY name ASC');
        res.json(bibles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List books of a Bible
router.get('/:bibleId/books', (req, res) => {
    try {
        const books = queryAll(
            'SELECT * FROM bible_books WHERE bible_id = ? ORDER BY book_number ASC',
            [req.params.bibleId]
        );
        res.json(books);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get verses for a chapter
router.get('/:bibleId/books/:bookId/chapters/:chapter/verses', (req, res) => {
    try {
        const verses = queryAll(
            'SELECT * FROM bible_verses WHERE bible_id = ? AND book_id = ? AND chapter = ? ORDER BY verse ASC',
            [req.params.bibleId, req.params.bookId, req.params.chapter]
        );
        res.json(verses);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Import Bible (JSON format)
router.post('/import', (req, res) => {
    const { name, abbreviation, language, books } = req.body;

    if (!name || !books || !Array.isArray(books)) {
        return res.status(400).json({ error: 'Faltan datos requeridos (nombre o libros)' });
    }

    try {
        const bibleId = uuid();
        const db = getDb();

        // Start transaction for atomic import if possible with sql.js-emulated DB
        // Since sql.js doesn't support real transactions across statements easily via run(), we'll just run them.

        db.run('INSERT INTO bibles (id, name, abbreviation, language) VALUES (?, ?, ?, ?)',
            [bibleId, name, abbreviation || '', language || 'es']);

        for (const book of books) {
            const bookId = uuid();
            db.run('INSERT INTO bible_books (id, bible_id, name, abbreviation, book_number, chapters_count, testament) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [bookId, bibleId, book.name, book.abbreviation || '', book.number, book.chapters.length, book.testament || 'OT']);

            for (const chapter of book.chapters) {
                for (const verse of chapter.verses) {
                    db.run('INSERT INTO bible_verses (id, bible_id, book_id, chapter, verse, text) VALUES (?, ?, ?, ?, ?, ?)',
                        [uuid(), bibleId, bookId, chapter.number, verse.number, verse.text]);
                }
            }
        }

        res.json({ success: true, bibleId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
