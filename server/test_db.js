import { initDatabase, queryAll } from './src/database.js';

async function test() {
    await initDatabase();

    console.log("--- SONGS MATCHING 'Cuan' ---");
    const songs = queryAll("SELECT id, title, author, length(chordpro) as cp_len, chordpro FROM songs WHERE title LIKE '%Cuan%'");
    for (const s of songs) {
        console.log(`\nTitle: ${s.title}`);
        console.log(`Chordpro Length: ${s.cp_len}`);
        console.log(`Chordpro Content: ${s.chordpro?.substring(0, 100)}...`);
    }

    process.exit(0);
}

test();
