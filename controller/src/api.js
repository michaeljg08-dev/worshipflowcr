const BASE = 'http://localhost:3000/api';

async function req(path, options = {}) {
    const res = await fetch(`${BASE}${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Request failed');
    }
    return res.json();
}

// Songs
export const api = {
    songs: {
        list: (params = {}) => req('/songs?' + new URLSearchParams(params)),
        get: (id) => req(`/songs/${id}`),
        create: (data) => req('/songs', { method: 'POST', body: data }),
        update: (id, data) => req(`/songs/${id}`, { method: 'PUT', body: data }),
        delete: (id) => req(`/songs/${id}`, { method: 'DELETE' }),
        transpose: (id, semitones) => req(`/songs/${id}/transpose`, { method: 'POST', body: { semitones } }),
    },
    playlists: {
        list: () => req('/playlists'),
        get: (id) => req(`/playlists/${id}`),
        create: (data) => req('/playlists', { method: 'POST', body: data }),
        update: (id, data) => req(`/playlists/${id}`, { method: 'PUT', body: data }),
        delete: (id) => req(`/playlists/${id}`, { method: 'DELETE' }),
        addSong: (id, data) => req(`/playlists/${id}/songs`, { method: 'POST', body: data }),
        removeSong: (id, entryId) => req(`/playlists/${id}/songs/${entryId}`, { method: 'DELETE' }),
        reorder: (id, order) => req(`/playlists/${id}/reorder`, { method: 'PUT', body: { order } }),
    },
    events: {
        list: (params = {}) => req('/events?' + new URLSearchParams(params)),
        get: (id) => req(`/events/${id}`),
        create: (data) => req('/events', { method: 'POST', body: data }),
        update: (id, data) => req(`/events/${id}`, { method: 'PUT', body: data }),
        delete: (id) => req(`/events/${id}`, { method: 'DELETE' }),
        attend: (id, data) => req(`/events/${id}/attend`, { method: 'POST', body: data }),
        comment: (id, data) => req(`/events/${id}/comments`, { method: 'POST', body: data }),
    },
    users: {
        list: () => req('/users'),
        get: (id) => req(`/users/${id}`),
        create: (data) => req('/users', { method: 'POST', body: data }),
        update: (id, data) => req(`/users/${id}`, { method: 'PUT', body: data }),
        delete: (id) => req(`/users/${id}`, { method: 'DELETE' }),
    },
    media: {
        list: (params = {}) => req('/media?' + new URLSearchParams(params)),
        upload: async (file, type = 'image') => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('file_type', type);
            const res = await fetch(`${BASE}/media/upload`, {
                method: 'POST',
                body: formData, // fetch will automatically set multipart/form-data boundary
            });
            if (!res.ok) throw new Error('Upload failed');
            return res.json();
        }
    },
    settings: {
        getAll: () => req('/users/settings/all'),
        set: (key, value) => req(`/users/settings/${key}`, { method: 'PUT', body: { value } }),
    },
    bibles: {
        list: () => req('/bibles'),
        getBooks: (bibleId) => req(`/bibles/${bibleId}/books`),
        getVerses: (bibleId, bookId, chapter) => req(`/bibles/${bibleId}/books/${bookId}/chapters/${chapter}/verses`),
        import: (data) => req('/bibles/import', { method: 'POST', body: data }),
    },
    status: () => req('/status'),
};

// WebSocket client
let ws = null;
const listeners = new Map();

export function connectWS(onOpen, onClose, clientType) {
    if (ws && ws.readyState === WebSocket.OPEN) return ws;

    const type = clientType || (window.location.pathname === '/display' ? 'projection' : 'controller');
    ws = new WebSocket(`ws://localhost:3000/ws?type=${type}&id=${type}-${Date.now()}`);

    ws.onopen = () => {
        console.log('🔌 WS connected');
        onOpen?.();
    };

    ws.onclose = () => {
        console.log('🔌 WS disconnected');
        onClose?.();
        // Reconnect after 3s
        setTimeout(() => connectWS(onOpen, onClose), 3000);
    };

    ws.onerror = (e) => console.error('WS error:', e);

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            const cbs = listeners.get(msg.type) || [];
            cbs.forEach(cb => cb(msg.data));
            const allCbs = listeners.get('*') || [];
            allCbs.forEach(cb => cb(msg));
        } catch (e) {
            console.error('WS parse error', e);
        }
    };

    return ws;
}

export function wsSend(type, data) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, data }));
    }
}

export function wsOn(type, callback) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
    return () => {
        const cbs = listeners.get(type) || [];
        listeners.set(type, cbs.filter(cb => cb !== callback));
    };
}

export function getWS() { return ws; }
