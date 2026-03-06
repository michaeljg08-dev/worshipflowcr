import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Music, ChevronUp, ChevronDown, Clock, Zap } from 'lucide-react';
import { api, connectWS, wsOn } from '../api';
import { useSyncData } from '../hooks/useSyncData';
import { parseChordPro } from '../utils/chordpro';

// ─── Componente para Dibujar Líneas con Acordes ─────────────────────
function ChordLine({ text }) {
    if (!text) return <div style={{ minHeight: 18 }} />;
    if (!text.includes('[')) return <div style={{ minHeight: 18, whiteSpace: 'pre-wrap' }}>{text}</div>;

    const parts = [];
    const chunks = text.split('[');

    for (const chunk of chunks) {
        if (!chunk) continue;
        const closeIdx = chunk.indexOf(']');
        if (closeIdx !== -1) {
            parts.push({
                chord: chunk.substring(0, closeIdx),
                lyric: chunk.substring(closeIdx + 1)
            });
        } else {
            parts.push({ chord: '', lyric: chunk });
        }
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', marginBottom: 8, lineHeight: 1.2 }}>
            {parts.map((p, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 800, fontSize: 13, minHeight: 16 }}>
                        {p.chord}
                    </span>
                    <span style={{ whiteSpace: 'pre', marginTop: -2 }}>{p.lyric || (p.chord ? ' ' : '')}</span>
                </div>
            ))}
        </div>
    );
}

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export default function SongView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const eventId = searchParams.get('eventId');

    const [localKey, setLocalKey] = useState(null);
    const [currentSectionLabel, setCurrentSectionLabel] = useState(null);
    const sectionRefs = useRef({});

    const { data: song, isSyncing } = useSyncData('songs', id);

    useEffect(() => {
        if (song && !localKey) setLocalKey(song.song_key);
    }, [song, localKey, song?.song_key]);

    useEffect(() => {
        // Connect to WebSocket and subscribe to live position updates
        // The connectWS function in api.js should handle reconnection logic and error suppression.
        connectWS();
        const unsub = wsOn('live:position', (data) => {
            console.log('Live position update:', data);
            setCurrentSectionLabel(data.label);

            // Auto-scroll to highlighted section
            if (data.label && sectionRefs.current[data.label]) {
                sectionRefs.current[data.label].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        return () => unsub();
    }, []);

    const transpose = (delta) => {
        if (!localKey) return;
        const idx = KEYS.indexOf(localKey.replace('m', ''));
        if (idx === -1) return;
        let nextIdx = (idx + delta) % 12;
        if (nextIdx < 0) nextIdx += 12;
        const isMinor = localKey.includes('m');
        setLocalKey(KEYS[nextIdx] + (isMinor ? 'm' : ''));
    };

    // Calcula la diferencia de semitonos entre la llave original y la actual
    const getDelta = () => {
        if (!song || !song.song_key || !localKey) return 0;
        const origIdx = KEYS.indexOf(song.song_key.replace('m', ''));
        const currIdx = KEYS.indexOf(localKey.replace('m', ''));
        if (origIdx === -1 || currIdx === -1) return 0;
        return (currIdx - origIdx + 12) % 12;
    };
    const delta = getDelta();

    // Transpone al vuelo la letra ChordPro
    const getTransposedChordPro = () => {
        if (!song || !song.chordpro) return '';
        if (delta === 0) return song.chordpro;

        return song.chordpro.replace(/\[([A-G][b#]?m?[0-9]*[a-zA-Z0-9]*)\]/g, (match, c) => {
            const rootMatch = c.match(/^[A-G][b#]?/);
            if (!rootMatch) return match;
            const root = rootMatch[0];
            const suffix = c.substring(root.length);
            const idx = KEYS.indexOf(root);
            if (idx === -1) return match;
            return '[' + KEYS[(idx + delta + 12) % 12] + suffix + ']';
        });
    };

    if (!song) return <div className="loading">Cargando canción... {isSyncing && '(Sincronizando)'}</div>;

    const sections = parseChordPro(getTransposedChordPro());

    return (
        <div className="song-view">
            <header style={{
                position: 'sticky', top: -20, background: 'var(--bg-dark)',
                zIndex: 10, padding: '10px 0 20px', borderBottom: '1px solid var(--border)',
                marginBottom: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <button className="btn" style={{ padding: 8, background: 'var(--bg-input)', color: 'var(--text-primary)' }} onClick={() => navigate(-1)}>
                        <ArrowLeft size={20} />
                    </button>
                    <div style={{ flex: 1 }}>
                        <h1 className="song-title" style={{ fontSize: 20 }}>{song.title}</h1>
                        <p className="text-muted" style={{ fontSize: 13 }}>{song.author || 'Autor desconocido'}</p>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="badge badge-primary" style={{ background: 'var(--primary)', padding: '6px 12px', fontSize: 14 }}>
                            {localKey || song.song_key}
                        </div>
                        <button className="btn btn-sm" style={{ padding: 6, background: 'var(--bg-input)', color: 'var(--text-primary)' }} onClick={() => transpose(-1)}><ChevronDown size={16} /></button>
                        <button className="btn btn-sm" style={{ padding: 6, background: 'var(--bg-input)', color: 'var(--text-primary)' }} onClick={() => transpose(1)}><ChevronUp size={16} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={14} /> {song.bpm} BPM</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={14} /> 4/4</span>
                    </div>
                </div>
            </header>

            <div className="song-content" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {sections.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40 }}>Esta canción no contiene letra en formato ChordPro.</div>
                ) : sections.map((sec, i) => {
                    const isHighlighted = currentSectionLabel === sec.label;
                    return (
                        <div
                            key={i}
                            ref={el => sectionRefs.current[sec.label] = el}
                            className={`card ${isHighlighted ? 'highlighted' : ''}`}
                            style={{
                                margin: 0,
                                transition: 'all 0.4s',
                                border: isHighlighted ? '2px solid var(--primary)' : '1px solid var(--border)',
                                background: isHighlighted ? 'rgba(99,102,241,0.1)' : 'var(--bg-card)',
                                boxShadow: isHighlighted ? '0 0 20px rgba(99,102,241,0.2)' : 'none',
                                transform: isHighlighted ? 'scale(1.02)' : 'scale(1)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <span className="section-badge" style={{
                                    background: isHighlighted ? 'var(--primary)' : 'var(--bg-input)',
                                    color: 'white', margin: 0
                                }}>
                                    {sec.label}
                                </span>
                            </div>
                            <div style={{
                                fontFamily: 'Inter', fontSize: 16,
                                color: isHighlighted ? 'var(--text-primary)' : 'var(--text-primary)',
                                fontWeight: 500
                            }}>
                                {sec.content.split('\n').map((line, k) => (
                                    <ChordLine key={k} text={line} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sync Status Badge */}
            <div style={{
                position: 'fixed', bottom: 85, right: 20,
                padding: '6px 12px', borderRadius: 20,
                background: isSyncing ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)',
                color: isSyncing ? 'var(--accent)' : 'var(--success)',
                fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                backdropFilter: 'blur(8px)'
            }}>
                <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'currentColor',
                    animation: isSyncing ? 'pulse 1s infinite' : 'none'
                }} />
                {isSyncing ? 'ACTUALIZANDO...' : 'MODO OFFLINE/NUBE'}
            </div>

            <style>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .highlighted pre {
          color: white !important;
        }
      `}</style>
        </div>
    );
}
