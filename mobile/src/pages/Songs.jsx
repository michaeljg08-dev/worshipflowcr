import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSyncData } from '../hooks/useSyncData';
import { Search, Music, ChevronRight } from 'lucide-react';

export default function Songs() {
    const navigate = useNavigate();
    const { data: songs, isSyncing } = useSyncData('songs');
    const [search, setSearch] = useState('');

    const filteredSongs = useMemo(() => {
        if (!search) return [...songs].sort((a, b) => a.title.localeCompare(b.title));
        const lowerSearch = search.toLowerCase();
        return songs.filter(s =>
            s.title.toLowerCase().includes(lowerSearch) ||
            (s.author && s.author.toLowerCase().includes(lowerSearch))
        ).sort((a, b) => a.title.localeCompare(b.title));
    }, [songs, search]);

    return (
        <div className="songs-page">
            <header style={{ position: 'sticky', top: -20, background: 'var(--bg-dark)', zIndex: 10, padding: '10px 0 20px', marginBottom: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Biblioteca de Canciones</h1>

                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Buscar por título o autor..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: '100%',
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border)',
                            borderRadius: 12,
                            padding: '12px 16px 12px 42px',
                            color: 'var(--text-primary)',
                            fontSize: 15,
                            outline: 'none'
                        }}
                    />
                </div>
            </header>

            <div className="song-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {filteredSongs.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                        <Music size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                        <p className="text-muted">
                            {songs.length === 0
                                ? (isSyncing ? 'Sincronizando canciones...' : 'Aún no hay canciones en el sistema.')
                                : 'No se encontraron resultados.'}
                        </p>
                    </div>
                ) : (
                    filteredSongs.map(song => (
                        <div key={song.id} className="card" onClick={() => navigate(`/song/${song.id}`)} style={{ margin: 0, padding: 16, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1, marginRight: 12 }}>
                                    <h3 className="song-title" style={{ fontSize: 16, marginBottom: 4 }}>{song.title}</h3>
                                    <p className="text-muted" style={{ fontSize: 13, marginBottom: 8 }}>{song.author || 'Autor desconocido'}</p>

                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <span className="section-badge" style={{ background: 'var(--primary)', color: 'white', margin: 0, fontSize: 10 }}>
                                            {song.song_key || 'C'}
                                        </span>
                                        {song.bpm && (
                                            <span className="section-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', margin: 0, fontSize: 10 }}>
                                                {song.bpm} BPM
                                            </span>
                                        )}
                                        {song.category && (
                                            <span className="section-badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', margin: 0, fontSize: 10 }}>
                                                {song.category}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <ChevronRight size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
