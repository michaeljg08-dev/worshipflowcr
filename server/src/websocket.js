import { WebSocketServer } from 'ws';
import { pushLiveState } from './supabase.js';

let wss;
const clients = new Map(); // ws -> { id, role, type }

// State cache for late-joining clients
let currentState = {
    isActive: false,
    playlistId: null,
    songIdx: null,
    item: null // { type: 'song' | 'media', data: ... }
};

export function initWebSocket(server) {
    wss = new WebSocketServer({ server, path: '/ws' });

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const clientType = url.searchParams.get('type') || 'controller'; // controller | projection | mobile
        const clientId = url.searchParams.get('id') || `anon-${Date.now()}`;

        clients.set(ws, { id: clientId, type: clientType, connectedAt: new Date() });
        console.log(`🔌 WS connected: ${clientType} (${clientId}) — Total: ${clients.size}`);

        // Send welcome + connected clients info
        ws.send(JSON.stringify({
            type: 'connected',
            data: { clientId, clientType, totalClients: clients.size, liveState: currentState }
        }));

        // Send current live state immediately to the new client
        ws.send(JSON.stringify({
            type: 'live:state',
            data: currentState
        }));

        // Broadcast updated client list
        broadcastClientList();

        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                handleMessage(ws, msg);
            } catch (e) {
                console.error('WS parse error:', e.message);
            }
        });

        ws.on('close', () => {
            clients.delete(ws);
            console.log(`🔌 WS disconnected — Total: ${clients.size}`);
            broadcastClientList();
        });

        ws.on('error', (err) => {
            console.error('WS error:', err.message);
            clients.delete(ws);
        });
    });

    console.log('⚡ WebSocket server ready at /ws');

    // Anunciar IP en Supabase una vez al arrancar para autodescubrimiento local
    pushLiveState();

    return wss;
}

function handleMessage(sender, msg) {
    const { type, data } = msg;
    const client = clients.get(sender);

    switch (type) {
        // ─── Projection Control ─────────────────────
        case 'projection:slide':
            if (!currentState.isActive || currentState.item?.type !== 'song') {
                currentState = {
                    ...currentState,
                    isActive: true,
                    item: { type: 'song', data: { title: data.songTitle, song_key: data.songKey } }
                };
            }
            // Forward slide to all projection clients
            broadcastTo('projection', { type: 'projection:slide', data });
            // Also notify mobile clients about current position
            broadcastTo('mobile', { type: 'live:position', data });
            broadcast('live:state', currentState);
            break;

        case 'projection:config':
            broadcastTo('projection', { type: 'projection:config', data });
            break;

        case 'projection:blackout':
            broadcastTo('projection', { type: 'projection:blackout', data });
            break;

        case 'projection:logo':
            broadcastTo('projection', { type: 'projection:logo', data });
            break;

        case 'projection:clear':
            broadcastTo('projection', { type: 'projection:clear', data });
            break;

        // ─── Live Session ───────────────────────────
        case 'live:start':
            currentState.isActive = true;
            if (data.playlistId) currentState.playlistId = data.playlistId;
            if (data.songDetails) {
                currentState.item = { type: 'song', data: data.songDetails };
                if (data.songIdx !== undefined) currentState.songIdx = data.songIdx;
            }
            broadcast('live:start', data);
            broadcast('live:state', currentState);
            break;

        case 'live:song':
            currentState.item = { type: 'song', data: data.songDetails || data };
            if (data.songIdx !== undefined) currentState.songIdx = data.songIdx;
            broadcast('live:song', data);
            broadcast('live:state', currentState);
            break;

        case 'live:position':
            broadcastTo('mobile', { type: 'live:position', data });
            broadcastTo('projection', { type: 'live:position', data });
            break;

        case 'live:end':
        case 'live:stop':
            currentState = { isActive: false, playlistId: null, songIdx: null, item: null };
            broadcast('live:end', data);
            broadcast('live:stop', data);
            broadcast('live:state', currentState);
            break;

        // ─── Sync ───────────────────────────────────
        case 'sync:request':
            // Client requesting full data sync
            sender.send(JSON.stringify({ type: 'sync:response', data: { status: 'ok' } }));
            break;

        // ─── Ping ───────────────────────────────────
        case 'ping':
            sender.send(JSON.stringify({ type: 'pong', data: { timestamp: Date.now() } }));
            break;

        default:
            // Forward unknown messages to all clients
            broadcast(type, data, sender);
    }
}

// Broadcast to ALL connected clients
export function broadcast(type, data, excludeWs = null) {
    const message = JSON.stringify({ type, data });
    for (const [ws] of clients) {
        if (ws !== excludeWs && ws.readyState === 1) {
            ws.send(message);
        }
    }
}

// Broadcast only to specific client type
function broadcastTo(clientType, msg) {
    const message = JSON.stringify(msg);
    for (const [ws, info] of clients) {
        if (info.type === clientType && ws.readyState === 1) {
            ws.send(message);
        }
    }
}

function broadcastClientList() {
    const list = [];
    for (const [, info] of clients) {
        list.push({ id: info.id, type: info.type });
    }
    broadcast('clients:list', list);
}

export function getConnectedClients() {
    const list = [];
    for (const [, info] of clients) {
        list.push(info);
    }
    return list;
}
