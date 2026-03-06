import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, ListMusic, Calendar, Users, TrendingUp, Clock, Zap, Music2 } from 'lucide-react';
import { api } from '../api';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const EVENT_TYPE_LABELS = { service: 'Servicio', rehearsal: 'Ensayo', special: 'Especial', other: 'Otro' };
const EVENT_TYPE_COLORS = { service: 'var(--primary)', rehearsal: 'var(--success)', special: 'var(--warning)', other: 'var(--text-muted)' };

export default function Dashboard() {
    const { data: songs = [] } = useQuery({ queryKey: ['songs', '', ''], queryFn: () => api.songs.list({}) });
    const { data: playlists = [] } = useQuery({ queryKey: ['playlists'], queryFn: api.playlists.list });
    const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: api.users.list });
    const { data: events = [] } = useQuery({
        queryKey: ['events', 'upcoming'],
        queryFn: () => api.events.list({ from: format(new Date(), 'yyyy-MM-dd') }),
    });
    const { data: serverStatus } = useQuery({ queryKey: ['status'], queryFn: api.status, refetchInterval: 10000 });

    const upcomingEvents = events.slice(0, 5);

    const stats = [
        { label: 'Canciones', value: songs.length, icon: Music, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
        { label: 'Playlists', value: playlists.length, icon: ListMusic, color: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
        { label: 'Eventos próx.', value: events.length, icon: Calendar, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        { label: 'Músicos', value: users.length, icon: Users, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5, marginBottom: 4 }}>Dashboard</h1>
                <p className="text-muted">Bienvenido al control de WorshipFlow</p>
            </div>

            {/* Stats */}
            <div className="grid grid-4">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className="stat-icon" style={{ background: s.bg }}>
                                <Icon size={20} color={s.color} />
                            </div>
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    );
                })}
            </div>

            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Upcoming Events */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title"><Calendar size={16} />Próximos eventos</span>
                        <span className="badge badge-muted">{upcomingEvents.length}</span>
                    </div>
                    {upcomingEvents.length === 0 ? (
                        <div className="empty-state" style={{ padding: '30px 0' }}>
                            <Calendar size={28} />
                            <p>No hay eventos próximos</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {upcomingEvents.map(ev => (
                                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 8, background: EVENT_TYPE_COLORS[ev.event_type] + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Calendar size={16} color={EVENT_TYPE_COLORS[ev.event_type]} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                                        <div className="text-muted" style={{ fontSize: 12 }}>
                                            {format(parseISO(ev.date), "EEE d 'de' MMM", { locale: es })}
                                            {ev.time && ` · ${ev.time.slice(0, 5)}`}
                                        </div>
                                    </div>
                                    <span className="badge" style={{ background: EVENT_TYPE_COLORS[ev.event_type] + '20', color: EVENT_TYPE_COLORS[ev.event_type] }}>
                                        {EVENT_TYPE_LABELS[ev.event_type]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Songs + Server status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title"><Music size={16} />Biblioteca</span>
                        </div>
                        {songs.slice(0, 5).map(song => (
                            <div key={song.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Music2 size={13} color="var(--primary)" />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</div>
                                    <div className="text-muted" style={{ fontSize: 11 }}>{song.author || '—'}</div>
                                </div>
                                <span className="chord-tag" style={{ fontSize: 11 }}>{song.song_key}</span>
                            </div>
                        ))}
                    </div>

                    {/* Server Status */}
                    <div className="card">
                        <div className="card-header">
                            <span className="card-title"><Zap size={16} />Estado del servidor</span>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: serverStatus ? 'var(--success)' : 'var(--danger)' }} />
                        </div>
                        {serverStatus ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span className="text-muted">Estado</span>
                                    <span className="badge badge-success">En línea</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span className="text-muted">Clientes conectados</span>
                                    <span style={{ fontWeight: 600 }}>{serverStatus.clients}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                    <span className="text-muted">Tiempo activo</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                                        <Clock size={12} color="var(--text-muted)" />
                                        <span>{Math.floor(serverStatus.uptime / 60)}m</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <p className="text-muted" style={{ fontSize: 13 }}>No se puede conectar al servidor en localhost:3000</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
