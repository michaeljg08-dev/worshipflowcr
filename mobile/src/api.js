const getSavedIp = () => {
    let ip = localStorage.getItem('server_ip');
    const host = window.location.hostname;
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    const isPublicWeb = host.includes('netlify.app') || host.includes('vercel.app') || host.includes('github.io');

    const currentHost = window.location.hostname;
    const isIp = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(currentHost);

    // If we're accessing via an IP directly, that should be our server IP
    if (isIp && ip !== currentHost) {
        console.log(`📡 Updating server IP to current host: ${currentHost}`);
        ip = currentHost;
        localStorage.setItem('server_ip', ip);
    }

    // Fallback for non-IP hosts (like local dev)
    if (!ip && !isLocalHost && !isPublicWeb) {
        ip = currentHost;
        localStorage.setItem('server_ip', ip);
    }
    return ip;
};

const getBaseUrl = () => {
    const ip = localStorage.getItem('server_ip');
    return ip ? `http://${ip}:3000/api` : 'http://localhost:3000/api';
};
const getWsUrl = () => {
    const ip = localStorage.getItem('server_ip');
    return ip ? `ws://${ip}:3000/ws` : 'ws://localhost:3000/ws';
};

export const setServerIp = (ip) => {
    console.log(`💾 Guardando nueva IP del servidor: ${ip}`);
    localStorage.setItem('server_ip', ip);
};

async function req(path, options = {}) {
    const controller = new AbortController();
    const timeout = options.timeout || 8000;
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(`${getBaseUrl()}${path}`, {
            headers: { 'Content-Type': 'application/json', ...options.headers },
            ...options,
            signal: controller.signal,
            body: options.body ? JSON.stringify(options.body) : undefined,
        });
        clearTimeout(id);
        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            throw new Error(err.error || 'Request failed');
        }
        return res.json();
    } catch (err) {
        clearTimeout(id);
        if (err.name === 'AbortError') {
            throw new Error('Connection timeout');
        }
        throw err;
    }
}

export const api = {
    songs: {
        list: (params = {}) => req('/songs?' + new URLSearchParams(params)),
        get: (id) => req(`/songs/${id}`),
    },
    playlists: {
        get: (id) => req(`/playlists/${id}`),
    },
    events: {
        list: (params = {}) => req('/events?' + new URLSearchParams(params)),
        get: (id) => req(`/events/${id}`),
    },
    status: () => req('/status', { timeout: 2000 }),
    sync: {
        changes: (since) => req(`/sync/changes?since=${encodeURIComponent(since)}`, { timeout: 2500 }),
    },
};

let ws = null;
const listeners = new Map();

export function connectWS(onOpen, onClose) {
    if (ws && ws.readyState === 1) return ws;

    const url = getWsUrl();
    if (!url) return null;

    try {
        ws = new WebSocket(url + '?type=mobile&id=mobile-' + Date.now());

        ws.onopen = () => onOpen?.();
        ws.onclose = () => {
            onClose?.();
            const delay = getSavedIp() ? 3000 : 10000; // Más rápido si tenemos IP guardada
            setTimeout(() => {
                if (navigator.onLine) connectWS(onOpen, onClose);
            }, delay);
        };
        ws.onerror = () => {
            // Silence socket errors to avoid console noise/UI issues
        };
        ws.onmessage = (e) => {
            try {
                const msg = JSON.parse(e.data);
                const cbs = listeners.get(msg.type) || [];
                cbs.forEach(cb => cb(msg.data));
            } catch (err) { }
        };
    } catch (e) {
        console.warn('Could not connect to WebSocket');
    }
    return ws;
}

export function wsOn(type, callback) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type).push(callback);
    return () => {
        const cbs = listeners.get(type) || [];
        listeners.set(type, cbs.filter(cb => cb !== callback));
    };
}
