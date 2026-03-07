import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, ChevronRight, Clock, MapPin, Music } from 'lucide-react';
import { api } from '../api';
import { format, parseISO } from 'date-fns';
import { useSyncData } from '../hooks/useSyncData';

export default function Home() {
    const navigate = useNavigate();
    const { data: events, isSyncing } = useSyncData('events');
    const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 5);

    const typeMap = {
        'service': 'Culto',
        'rehearsal': 'Ensayo',
        'special': 'Especial',
        'other': 'Otro'
    };
    // But we can show a small syncing indicator if needed

    const [discoveredIp, setDiscoveredIp] = React.useState(localStorage.getItem('discovered_ip'));

    React.useEffect(() => {
        const interval = setInterval(() => {
            setDiscoveredIp(localStorage.getItem('discovered_ip'));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="home-page">
            {discoveredIp && (
                <div style={{
                    background: 'rgba(34, 197, 94, 0.15)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 12,
                    padding: '12px 16px',
                    marginBottom: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    animation: 'fadeIn 0.3s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#4ade80', letterSpacing: 0.5 }}>COMPUTADORA DETECTADA</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>IP: {discoveredIp}</span>
                        <a href={`http://${discoveredIp}:3000/mobile`} style={{
                            fontSize: 12, fontWeight: 800, color: 'white', background: 'var(--success)',
                            padding: '6px 14px', borderRadius: 8, textDecoration: 'none'
                        }}>VINCULAR AHORA</a>
                    </div>
                </div>
            )}

            <header style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 28, fontWeight: 800 }}>Hola, Músico 👋</h1>
                <p style={{ color: 'var(--text-muted)' }}>Próximos servicios y ensayos</p>
            </header>

            <section>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Próximos Eventos</h2>

                {sortedEvents.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Calendar size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                        <p className="text-muted">No hay eventos programados próximamente.</p>
                    </div>
                ) : (
                    sortedEvents.map(event => (
                        <div key={event.id} className="card" onClick={() => {
                            if (event.playlist_id) {
                                navigate(`/setlist/${event.playlist_id}`);
                            } else {
                                alert('Este evento no tiene un Setlist asignado aún.');
                            }
                        }} style={{ cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div className="section-badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                                        {typeMap[event.event_type] || 'Evento'}
                                    </div>
                                    <h3 className="song-title">{event.title}</h3>
                                    <div className="song-meta">
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Calendar size={13} /> {format(parseISO(event.date), 'EEE d MMMM')}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <Clock size={13} /> {event.time}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    ))
                )}
            </section>

            <section style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Acceso Rápido</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button className="btn card" style={{ flexDirection: 'column', padding: '24px 16px', gap: 12, margin: 0 }} onClick={() => navigate('/songs')}>
                        <div style={{ padding: 12, background: 'rgba(245,158,11,0.25)', color: 'var(--accent)', borderRadius: 12 }}>
                            <Music size={24} />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>Biblioteca</span>
                    </button>
                    <button className="btn card" style={{ flexDirection: 'column', padding: '24px 16px', gap: 12, margin: 0 }}>
                        <div style={{ padding: 12, background: 'rgba(16,185,129,0.25)', color: 'var(--success)', borderRadius: 12 }}>
                            <Calendar size={24} />
                        </div>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>Mi Agenda</span>
                    </button>
                </div>
            </section>
        </div>
    );
}
