import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Calendar, Music, ListMusic, ChevronRight, ArrowLeft } from 'lucide-react';
import { api } from '../api';
import { useSyncData } from '../hooks/useSyncData';

export default function Setlist() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: playlist, isSyncing: syncingPlaylist } = useSyncData('playlists', id, { resolved: true });
    const { data: recentPlaylists } = useSyncData('playlists');
    // Sort playlists by updated_at or created_at descending
    const sortedRecent = [...recentPlaylists].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at)).reverse();

    if (!id) {
        return (
            <div className="setlist-page">
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 20 }}>Setlists Guardados</h1>
                {sortedRecent.map(p => (
                    <div key={p.id} className="card" onClick={() => navigate(`/setlist/${p.id}`)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h3 className="song-title" style={{ fontSize: 16 }}>{p.name}</h3>
                                <p className="text-muted" style={{ fontSize: 12 }}>{p.description || 'Sin descripción'}</p>
                            </div>
                            <ChevronRight size={18} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!playlist && id) return <div className="loading">Cargando setlist... {syncingPlaylist && '(Sincronizando)'}</div>;

    const songs = playlist?.songs || [];

    return (
        <div className="setlist-page">
            <header style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn" style={{ padding: 8, background: 'var(--bg-input)' }} onClick={() => navigate('/')}>
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h1 style={{ fontSize: 20, fontWeight: 800 }}>{playlist.name}</h1>
                    <p className="text-muted" style={{ fontSize: 13 }}>{songs.length} canciones</p>
                </div>
            </header>

            <div className="song-list">
                {songs.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 40 }}>
                        <ListMusic size={48} style={{ margin: '0 auto 16px', opacity: 0.1 }} />
                        <p className="text-muted">No hay canciones asignadas a este evento.</p>
                    </div>
                ) : (
                    songs.map((ps, i) => (
                        <div key={ps.id} className="card" onClick={() => navigate(`/song/${ps.song_id}?eventId=${id}`)}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{
                                    width: 32, height: 32, borderRadius: 8, background: 'var(--bg-input)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: 14, fontWeight: 800, color: 'var(--primary)'
                                }}>
                                    {i + 1}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h3 className="song-title" style={{ fontSize: 16, marginBottom: 0 }}>{ps.title}</h3>
                                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                                        <span className="section-badge" style={{ background: 'rgba(245,158,11,0.2)', color: 'var(--accent)', margin: 0, fontSize: 9 }}>
                                            {ps.custom_key || 'Standard'}
                                        </span>
                                    </div>
                                </div>
                                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
