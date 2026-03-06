import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, 'data', 'worship-flow.db');

async function migrate() {
    if (!existsSync(DB_PATH)) {
        console.log('No DB exists yet, skipping migration.');
        return;
    }

    const SQL = await initSqlJs();
    const buffer = readFileSync(DB_PATH);
    const db = new SQL.Database(buffer);

    // 1. Check if column exists
    try {
        db.run('SELECT chordpro FROM songs LIMIT 1');
        console.log('Column chordpro already exists.');
    } catch (e) {
        console.log('Adding chordpro column...');
        db.run('ALTER TABLE songs ADD COLUMN chordpro TEXT DEFAULT ""');
    }

    // 2. Convert old sections to Chordpro
    // We will do this by reading songs, getting their sections, and if chordpro is empty, building it.
    const getResult = (stmt) => {
        const results = [];
        while (stmt.step()) results.push(stmt.getAsObject());
        stmt.free();
        return results;
    };

    const songsStmt = db.prepare('SELECT id, chordpro FROM songs');
    const songs = getResult(songsStmt);

    let migratedCount = 0;

    for (const song of songs) {
        if (!song.chordpro || song.chordpro.trim() === '') {
            const sectionsStmt = db.prepare('SELECT * FROM song_sections WHERE song_id = ? ORDER BY sort_order');
            sectionsStmt.bind([song.id]);
            const sections = getResult(sectionsStmt);

            if (sections.length > 0) {
                let cpChunks = [];
                for (const section of sections) {
                    // Try to guess type
                    let label = section.label || section.type || 'Verse';
                    cpChunks.push(`{c: ${label}}`);

                    const chords = JSON.parse(section.chords || '[]');
                    if (chords.length > 0) {
                        cpChunks.push(chords.map(c => `[${c}]`).join(' '));
                    }
                    if (section.content && section.content.trim()) {
                        cpChunks.push(section.content.trim());
                    }
                    cpChunks.push(''); // blank line
                }
                const chordproStr = cpChunks.join('\\n').trim();

                db.run('UPDATE songs SET chordpro = ? WHERE id = ?', [chordproStr, song.id]);
                migratedCount++;
            }
        }
    }

    console.log(`Migrated ${migratedCount} songs to ChordPro format.`);

    const data = db.export();
    writeFileSync(DB_PATH, Buffer.from(data));
    console.log('Migration completed and saved.');
}

migrate().catch(console.error);
