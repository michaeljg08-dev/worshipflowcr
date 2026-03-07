import initSqlJs from 'sql.js';
import { v4 as uuid } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, '..', 'data');
const DB_PATH = join(DATA_DIR, 'worship-flow.db');

let db;

export async function initDatabase() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (existsSync(DB_PATH)) {
    const buffer = readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA journal_mode = WAL;');
  db.run('PRAGMA foreign_keys = ON;');

  createTables();
  saveDatabase();

  // Auto-save every 30 seconds
  setInterval(saveDatabase, 30000);

  console.log('📦 Database initialized at', DB_PATH);
  return db;
}

function createTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      instrument TEXT DEFAULT '',
      role TEXT DEFAULT 'musician' CHECK(role IN ('admin','musician','viewer')),
      pin_hash TEXT DEFAULT '',
      avatar_color TEXT DEFAULT '#6366f1',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT DEFAULT '',
      song_key TEXT DEFAULT 'C',
      bpm INTEGER DEFAULT 120,
      time_signature TEXT DEFAULT '4/4',
      category TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      chordpro TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Migrate existing songs table if missing chordpro column
  try {
    const columns = db.exec("PRAGMA table_info(songs)")[0]?.values.map(c => c[1]) || [];
    if (!columns.includes('chordpro')) {
      db.run("ALTER TABLE songs ADD COLUMN chordpro TEXT DEFAULT ''");

      // Convert legacy sections to chordpro
      const oldSongs = db.exec("SELECT id FROM songs")[0]?.values || [];
      for (const [id] of oldSongs) {
        const sectionsResult = db.exec("SELECT type, label, content, chords FROM song_sections WHERE song_id = ? ORDER BY sort_order", [id]);
        if (sectionsResult.length > 0) {
          let cp = '';
          for (const row of sectionsResult[0].values) {
            const [, label, content, chords] = row;
            cp += '{c: ' + (label || 'Verso') + '}\\n';
            const parsedChords = JSON.parse(chords || '[]');
            if (parsedChords.length > 0) cp += parsedChords.map(c => '[' + c + ']').join(' ') + '\\n';
            if (content) cp += content + '\\n';
            cp += '\\n';
          }
          db.run("UPDATE songs SET chordpro = ? WHERE id = ?", [cp.trim(), id]);
        }
      }
      console.log("✅ LIVE MIGRATION: Added 'chordpro' column to 'songs' table and ported sections.");
    }
  } catch (e) {
    console.error("Migration error:", e.message);
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS song_sections (
      id TEXT PRIMARY KEY,
      song_id TEXT NOT NULL,
      type TEXT DEFAULT 'verse' CHECK(type IN ('intro','verse','pre_chorus','chorus','bridge','interlude','outro','custom')),
      label TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      content TEXT DEFAULT '',
      chords TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS playlist_songs (
      id TEXT PRIMARY KEY,
      playlist_id TEXT NOT NULL,
      song_id TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      custom_key TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
      FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT DEFAULT '',
      end_time TEXT DEFAULT '',
      playlist_id TEXT DEFAULT '',
      event_type TEXT DEFAULT 'service' CHECK(event_type IN ('service','rehearsal','special','other')),
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_attendance (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','confirmed','declined','maybe')),
      confirmed_at TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(event_id, user_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      song_id TEXT DEFAULT '',
      event_id TEXT DEFAULT '',
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT DEFAULT '',
      file_type TEXT DEFAULT 'image' CHECK(file_type IN ('image','video','background','logo')),
      path TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT DEFAULT '{}'
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      table_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      action TEXT NOT NULL CHECK(action IN ('insert','update','delete')),
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      synced_at TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bibles (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT DEFAULT '',
      language TEXT DEFAULT 'es',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bible_books (
      id TEXT PRIMARY KEY,
      bible_id TEXT NOT NULL,
      name TEXT NOT NULL,
      abbreviation TEXT DEFAULT '',
      book_number INTEGER NOT NULL,
      chapters_count INTEGER DEFAULT 0,
      testament TEXT DEFAULT 'OT',
      FOREIGN KEY (bible_id) REFERENCES bibles(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bible_verses (
      id TEXT PRIMARY KEY,
      bible_id TEXT NOT NULL,
      book_id TEXT NOT NULL,
      chapter INTEGER NOT NULL,
      verse INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (bible_id) REFERENCES bibles(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES bible_books(id) ON DELETE CASCADE
    )
  `);

  db.run('CREATE INDEX IF NOT EXISTS idx_verses_lookup ON bible_verses (bible_id, book_id, chapter, verse)');

  // Insert default settings
  const hasSettings = db.exec("SELECT COUNT(*) as c FROM settings");
  if (hasSettings[0]?.values[0][0] === 0) {
    db.run(`INSERT OR IGNORE INTO settings (key, value) VALUES 
      ('projection', '{"fontSize":48,"fontFamily":"Inter","textColor":"#ffffff","bgColor":"#000000","textShadow":true,"transition":"fade"}'),
      ('general', '{"churchName":"Mi Iglesia","language":"es"}')
    `);
  }

  // Insert default admin user
  const hasUsers = db.exec("SELECT COUNT(*) as c FROM users");
  if (hasUsers[0]?.values[0][0] === 0) {
    db.run(`INSERT INTO users (id, name, role, instrument) VALUES ('admin-default', 'Administrador', 'admin', 'Dirección')`);
  }
}

export function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  writeFileSync(DB_PATH, buffer);
}

export function getDb() {
  return db;
}

// ─── Helper query functions ──────────────────────────────────────

export function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

export function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

export function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
  return { changes: db.getRowsModified() };
}

export function logSync(tableName, recordId, action, data = {}) {
  return runQuery(
    'INSERT INTO sync_queue (table_name, record_id, action, data) VALUES (?, ?, ?, ?)',
    [tableName, recordId, action, JSON.stringify(data)]
  );
}
