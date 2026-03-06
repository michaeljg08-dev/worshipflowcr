import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Music, ListMusic, Calendar, Monitor,
    Users, Settings, Wifi, WifiOff, ChevronRight
} from 'lucide-react';
import { connectWS } from '../api';

const navItems = [
    { section: 'Principal' },
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/projection', icon: Monitor, label: 'Proyección' },
    { section: 'Contenido' },
    { to: '/songs', icon: Music, label: 'Canciones' },
    { to: '/playlists', icon: ListMusic, label: 'Playlists' },
    { to: '/events', icon: Calendar, label: 'Eventos' },
    { section: 'Configuración' },
    { to: '/users', icon: Users, label: 'Músicos' },
    { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export default function Sidebar() {
    const [wsOnline, setWsOnline] = useState(false);
    const [clients, setClients] = useState(0);

    useEffect(() => {
        const ws = connectWS(
            () => setWsOnline(true),
            () => setWsOnline(false)
        );

        const handler = (e) => {
            try {
                const msg = JSON.parse(e.data);
                if (msg.type === 'clients:list') setClients(msg.data.length);
            } catch { /* noop */ }
        };

        const interval = setInterval(() => {
            if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: 'ping', data: {} }));
        }, 15000);

        if (ws) ws.addEventListener('message', handler);
        return () => {
            clearInterval(interval);
            if (ws) ws.removeEventListener('message', handler);
        };
    }, []);

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">🎵</div>
                <div className="sidebar-logo-text">
                    <h2>WorshipFlow</h2>
                    <span>Control Center</span>
                </div>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item, i) => {
                    if (item.section) return <div key={i} className="nav-section-label">{item.section}</div>;
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                        >
                            <Icon size={16} />
                            {item.label}
                        </NavLink>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                <div className="ws-status">
                    <div className={`ws-dot${wsOnline ? ' online' : ''}`} />
                    {wsOnline ? (
                        <span>{clients} cliente{clients !== 1 ? 's' : ''} conectado{clients !== 1 ? 's' : ''}</span>
                    ) : (
                        <span>Sin conexión al servidor</span>
                    )}
                </div>
            </div>
        </aside>
    );
}
