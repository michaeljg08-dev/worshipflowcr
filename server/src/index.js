import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import os from 'os';

import { initDatabase } from './database.js';
import { initWebSocket, getConnectedClients } from './websocket.js';
import songsRouter from './routes/songs.js';
import playlistsRouter from './routes/playlists.js';
import eventsRouter from './routes/events.js';
import usersRouter from './routes/users.js';
import mediaRouter from './routes/media.js';
import syncRouter from './routes/sync.js';
import biblesRouter from './routes/bibles.js';
import { getLanIp } from './utils/network.js';
import { clearLiveState } from './supabase.js';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const app = express();
const server = createServer(app);

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(join(__dirname, '..', 'data', 'uploads')));

// ─── API Routes ─────────────────────────────────────────────
app.use('/api/songs', songsRouter);
app.use('/api/playlists', playlistsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/users', usersRouter);
app.use('/api/media', mediaRouter);
app.use('/api/sync', syncRouter);
app.use('/api/bibles', biblesRouter);

// ─── Serve Frontend ─────────────────────────────────────────
app.use(express.static(join(__dirname, '..', 'public')));
app.use('/mobile', express.static(join(__dirname, '..', 'public-mobile')));

// ─── Status endpoint ───────────────────────────────────────
app.get('/api/status', (req, res) => {
    const lanIp = getLanIp();

    res.json({
        status: 'running',
        version: '1.0.0',
        name: os.hostname() || 'WorshipFlow Server',
        clients: getConnectedClients().length,
        uptime: process.uptime(),
        lanIp: lanIp
    });
});

// ─── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.status || 500).json({ error: err.message });
});

// ─── React Router Fallback ──────────────────────────────────
app.get('/mobile/*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public-mobile', 'index.html'));
});

app.get('*', (req, res) => {
    res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────
async function start() {
    await initDatabase();
    initWebSocket(server);

    server.listen(PORT, '0.0.0.0', () => {
        console.log('');
        console.log('╔══════════════════════════════════════════════╗');
        console.log('║        🎵  WorshipFlow Server  🎵           ║');
        console.log('╠══════════════════════════════════════════════╣');
        console.log(`║  REST API:   http://localhost:${PORT}/api       ║`);
        console.log(`║  WebSocket:  ws://localhost:${PORT}/ws          ║`);
        console.log(`║  Status:     http://localhost:${PORT}/api/status ║`);
        console.log('╚══════════════════════════════════════════════╝');
        console.log('');
    });
}

start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
});

// ─── Graceful Shutdown ───────────────────────────────────────
async function shutdown() {
    console.log('\n🛑 Intentando apagado ordenado...');
    await clearLiveState();
    process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
