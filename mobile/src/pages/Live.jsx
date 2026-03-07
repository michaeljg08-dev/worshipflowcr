import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MonitorPlay, Clock, Zap, ChevronUp, ChevronDown, ListEnd, Book } from 'lucide-react';
import { api, connectWS, wsOn } from '../api';
import { parseChordPro } from '../utils/chordpro';
import { useSyncData } from '../hooks/useSyncData';
import { supabase } from '../utils/supabase';

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

// ─── Componente para renderizar una canción restante de la playlist ──
// Each song is its own component so it can call useSyncData to fetch full data (including chordpro)
function RemainingSongEntry({ song, songIndex, sectionRefs }) {
    const songId = song.song_id || `remaining-${songIndex}`;
    // Fetch full song data from sync cache (this is what makes chordpro available)
    const { data: fullSongData } = useSyncData('songs', song.song_id);
    // Merge: full song (has chordpro) + playlist_songs overlay (has custom_key, etc.)
    const mergedSong = fullSongData ? { ...fullSongData, ...song } : song;

    const songChordPro = mergedSong.chordpro || '';
    const songSections = parseChordPro(songChordPro);
    const songKey = mergedSong.custom_key || mergedSong.song_key;

    return (
        <React.Fragment>
            {/* ── Subtle Song Divider ── */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                margin: '8px 0',
                padding: '10px 0'
            }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    fontSize: 13, fontWeight: 700, color: 'var(--text-muted)',
                    whiteSpace: 'nowrap'
                }}>
                    <span>{mergedSong.title}</span>
                    {songKey && (
                        <span style={{
                            background: 'var(--bg-input)', color: 'var(--primary)',
                            padding: '2px 8px', borderRadius: 4,
                            fontSize: 11, fontWeight: 700
                        }}>
                            {songKey}
                        </span>
                    )}
                    {mergedSong.bpm && (
                        <span style={{ fontSize: 11, opacity: 0.6 }}>{mergedSong.bpm} BPM</span>
                    )}
                </div>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>

            {/* ── Song Sections ── */}
            {songSections.length > 0 ? songSections.map((sec, i) => {
                const refKey = songId + ':' + sec.label;
                return (
                    <div
                        key={`${songId}-${i}`}
                        ref={el => sectionRefs.current[refKey] = el}
                        className="card"
                        style={{
                            margin: 0,
                            border: '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            opacity: 0.7
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <span className="section-badge" style={{
                                background: 'var(--bg-input)', color: 'var(--text-muted)',
                                margin: 0
                            }}>
                                {sec.label}
                            </span>
                        </div>
                        <div style={{
                            fontFamily: 'Inter', fontSize: 16,
                            color: 'var(--text-primary)', fontWeight: 500
                        }}>
                            {sec.content.split('\n').map((line, k) => (
                                <ChordLine key={k} text={line} />
                            ))}
                        </div>
                    </div>
                );
            }) : (
                /* Fallback: show title when no ChordPro */
                <div className="card" style={{
                    margin: 0, border: '1px solid var(--border)',
                    background: 'var(--bg-card)', opacity: 0.7
                }}>
                    <div style={{
                        fontFamily: 'Inter', fontSize: 16,
                        color: 'var(--text-primary)', fontWeight: 500,
                        whiteSpace: 'pre-wrap', lineHeight: 1.8
                    }}>
                        {mergedSong.title || 'Sin letra disponible'}
                    </div>
                </div>
            )}
        </React.Fragment>
    );
}

export default function Live() {
    const [liveState, setLiveState] = useState({ isActive: false, playlistId: null, songIdx: null, item: null });
    const [currentSectionLabel, setCurrentSectionLabel] = useState(null);
    const [localKey, setLocalKey] = useState(null);
    const [wsStatus, setWsStatus] = useState('connecting');
    const [serverName, setServerName] = useState('');
    const sectionRefs = useRef({}); // keyed as `songId:sectionLabel`
    const [discoveredIp, setDiscoveredIp] = useState(localStorage.getItem('discovered_ip'));

    // Reactive check for discovered_ip in localStorage
    useEffect(() => {
        if (wsStatus === 'connected') return;
        const interval = setInterval(() => {
            const ip = localStorage.getItem('discovered_ip');
            // If the IP was removed from localStorage (by the App's heartbeat check), 
            // we update our local state to hide the button.
            if (ip !== discoveredIp) {
                setDiscoveredIp(ip);
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [discoveredIp, wsStatus]);

    // Escuchar el estado de la proyección general y la posición actual
    useEffect(() => {
        const ws = connectWS(
            () => {
                setWsStatus('connected');
                // Fetch server name if possible
                api.status().then(s => setServerName(s.name)).catch(() => setServerName('Local'));
                // Clear discovery once connected
                localStorage.removeItem('discovered_ip');
                setDiscoveredIp(null);
            },
            () => {
                setWsStatus('disconnected');
                setServerName('');
            }
        );

        const unsubState = wsOn('live:state', (state) => {
            console.log('Live state update:', state);
            setLiveState(state || { isActive: false, playlistId: null, songIdx: null, item: null });
        });

        const unsubPos = wsOn('live:position', (data) => {
            console.log('Live position update:', data);
            setCurrentSectionLabel(data.label);
        });

        return () => {
            unsubState();
            unsubPos();
        };
    }, [wsStatus]);

    // Auto-scroll optimizado: Se dispara cuando cambia la sección o el estado
    // Refs are scoped by song_id to avoid collisions when songs share labels (e.g. "Verso 1")
    useEffect(() => {
        if (!currentSectionLabel || !currentSong?.song_id) return;
        const refKey = currentSong.song_id + ':' + currentSectionLabel;
        const element = sectionRefs.current[refKey];
        if (element) {
            requestAnimationFrame(() => {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }, [currentSectionLabel, liveState, currentSong?.song_id]);

    const isLive = liveState?.isActive && liveState?.item;
    const isSong = isLive && liveState.item.type === 'song';
    // Event though websocket sends basic songDetails, we only trust its song_id to fetch the full chordpro.
    // NOTE: minimalSong comes from a `playlist_songs` record on the Controller. 
    // It contains overrides like `custom_key` and might map `song_key` differently.
    const minimalSong = isSong ? liveState.item.data : null;

    // DEBUG: Let's see exactly what's inside minimalSong
    console.log('[LIVE DBG] liveState.item.data:', minimalSong);
    console.log('[LIVE DBG] song_id exist?', minimalSong?.song_id);

    // Fetch the full song using useSyncData so we get the 'chordpro' field
    const { data: fullSong, isSyncing: songSyncing } = useSyncData('songs', minimalSong?.song_id);

    // Merge them: the minimal data from the playlist (which contains the active key and basic fields like title/bpm) 
    // layered on top of the full database object (which contains the chordpro)
    const currentSong = fullSong ? { ...fullSong, ...minimalSong } : minimalSong;

    // Safety check for UI: If fullSong isn't synced yet, `currentSong.title` is preserved because minimalSong has it.

    // Fetch the playlist to calculate the next song
    const { data: currentPlaylist } = useSyncData('playlists', liveState?.playlistId, { resolved: true });

    // Initial load of the local key when a new song starts
    useEffect(() => {
        if (currentSong) {
            // Respect the playlist's custom_key first, otherwise fall back to the global song_key
            const activeKey = currentSong.custom_key || currentSong.song_key;
            if (activeKey) {
                setLocalKey(activeKey);
            }
        }
    }, [currentSong?.song_id, currentSong?.custom_key, currentSong?.song_key]);

    const transpose = (delta) => {
        if (!localKey) return;
        const idx = KEYS.indexOf(localKey.replace('m', ''));
        if (idx === -1) return;
        let nextIdx = (idx + delta) % 12;
        if (nextIdx < 0) nextIdx += 12;
        const isMinor = localKey.includes('m');
        setLocalKey(KEYS[nextIdx] + (isMinor ? 'm' : ''));
    };

    const getDelta = () => {
        if (!currentSong || !localKey) return 0;
        const baseKey = currentSong.custom_key || currentSong.song_key;
        if (!baseKey) return 0;

        const origIdx = KEYS.indexOf(baseKey.replace('m', ''));
        const currIdx = KEYS.indexOf(localKey.replace('m', ''));
        if (origIdx === -1 || currIdx === -1) return 0;
        return (currIdx - origIdx + 12) % 12;
    };

    const delta = getDelta();

    const getTransposedChordPro = () => {
        if (!currentSong || !currentSong.chordpro) return '';
        if (delta === 0) return currentSong.chordpro;

        return currentSong.chordpro.replace(/\[([A-G][b#]?m?[0-9]*[a-zA-Z0-9]*)\]/g, (match, c) => {
            const rootMatch = c.match(/^[A-G][b#]?/);
            if (!rootMatch) return match;
            const root = rootMatch[0];
            const suffix = c.substring(root.length);
            const idx = KEYS.indexOf(root);
            if (idx === -1) return match;
            return '[' + KEYS[(idx + delta + 12) % 12] + suffix + ']';
        });
    };

    const ConnectionBanner = () => {
        if (wsStatus !== 'connected') return null;

        return (
            <div style={{
                padding: '8px 16px',
                background: 'rgba(34, 197, 94, 0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: 12,
                fontWeight: 600,
                color: '#4ade80',
                width: '100%',
                position: 'sticky',
                top: 0,
                zIndex: 100,
                backdropFilter: 'blur(8px)'
            }}>
                <div style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: 'currentColor',
                    boxShadow: '0 0 8px currentColor'
                }} />
                <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    📡 MODO LOCAL: {serverName || 'Controlador'}
                </span>
            </div>
        );
    };

    if (wsStatus !== 'connected') {
        return (
            <div className="live-page">
                <ConnectionBanner />
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px', margin: 20 }}>
                    <MonitorPlay size={48} style={{ color: 'var(--text-muted)', marginBottom: 20, opacity: 0.5 }} />
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Modo Remoto</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                        La transmisión de letras en vivo está configurada como <b>Estrictamente Local</b>.
                        Para ver las diapositivas en tiempo real, conéctate al Wi-Fi de la iglesia.
                    </p>

                    {discoveredIp && (
                        <div style={{ marginTop: 24, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
                            <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 'bold', marginBottom: 4 }}>
                                ✅ CONTROLADOR DETECTADO EN LA RED
                            </p>
                            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12, opacity: 0.7 }}>
                                IP: {discoveredIp}
                            </p>
                            <a
                                href={`http://${discoveredIp}:3000/mobile`}
                                style={{
                                    background: 'var(--primary)',
                                    color: 'white',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    textDecoration: 'none',
                                    fontWeight: 'bold',
                                    display: 'inline-block'
                                }}
                            >
                                VINCULAR MODO LOCAL
                            </a>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!isLive) {
        return (
            <div className="live-page">
                <ConnectionBanner />
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px', margin: 20 }}>
                    <MonitorPlay size={48} style={{ color: 'var(--text-muted)', marginBottom: 20, opacity: 0.5 }} />
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Sin Proyección</h2>
                    <p style={{ color: 'var(--text-muted)' }}>Esperando a que inicie la proyección en la computadora principal...</p>
                </div>
            </div>
        );
    }

    if (!isSong || !currentSong) {
        if (liveState.item?.type === 'bible') {
            const bibleData = liveState.item.data;
            return (
                <div className="live-page">
                    <ConnectionBanner />
                    <div className="card" style={{ padding: '40px 20px', margin: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Book size={24} style={{ color: 'var(--primary)' }} />
                                <h2 style={{ fontSize: 20, margin: 0 }}>{bibleData.title}</h2>
                            </div>
                            <div className="badge badge-primary">{bibleData.source || 'Biblia'}</div>
                        </div>
                        <div style={{
                            fontSize: 22, lineHeight: 1.6, color: 'var(--text-primary)',
                            fontWeight: 500, fontStyle: 'italic'
                        }}>
                            "{currentSectionLabel || '...'}"
                        </div>
                    </div>
                </div>
            );
        }
        return (
            <div className="live-page">
                <ConnectionBanner />
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px', margin: 20 }}>
                    <MonitorPlay size={48} style={{ color: 'var(--primary)', marginBottom: 20 }} />
                    <h2 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>Proyectando: {liveState.item.type === 'title' ? 'Título' : 'Elemento visual'}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>La pantalla principal está proyectando algo distinto a una canción.</p>
                </div>
            </div>
        );
    }

    const sections = parseChordPro(getTransposedChordPro());

    // Determine the current song index in the playlist
    // songIdx comes from the controller via WS, but may be null/undefined initially
    let effectiveSongIdx = liveState.songIdx;
    if (typeof effectiveSongIdx !== 'number' && currentPlaylist?.songs && currentSong?.song_id) {
        // Infer index by matching song_id in the playlist
        effectiveSongIdx = currentPlaylist.songs.findIndex(s => s.song_id === currentSong.song_id);
        if (effectiveSongIdx === -1) effectiveSongIdx = null;
    }

    // Get ALL remaining songs after the current one
    const remainingSongs = currentPlaylist && typeof effectiveSongIdx === 'number'
        ? (currentPlaylist?.songs || []).slice(effectiveSongIdx + 1)
        : [];

    // DEBUG INFO (temporary - will be removed after debugging)
    const debugInfo = {
        wsStatus,
        isLive: !!isLive,
        isSong: !!isSong,
        songIdx: liveState.songIdx,
        effectiveSongIdx,
        playlistId: liveState?.playlistId,
        hasPlaylist: !!currentPlaylist,
        playlistSongsCount: currentPlaylist?.songs?.length || 0,
        remainingCount: remainingSongs.length,
        currentSongId: currentSong?.song_id,
        hasFullSong: !!fullSong,
        hasChordpro: !!currentSong?.chordpro,
        sectionsCount: sections.length,
        minimalSongId: minimalSong?.song_id,
    };

    return (
        <div className="live-page" style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
            <ConnectionBanner />
            {/* DEBUG PANEL - TEMPORARY */}
            <div style={{ padding: '6px 12px', background: '#1a1a2e', fontSize: 9, color: '#aaa', borderBottom: '1px solid #333', lineHeight: 1.6, fontFamily: 'monospace' }}>
                🔍 ws:{debugInfo.wsStatus} | live:{String(debugInfo.isLive)} | song:{String(debugInfo.isSong)} | idx:{String(debugInfo.songIdx)}→{String(debugInfo.effectiveSongIdx)}
                | playlist:{debugInfo.hasPlaylist ? `✅(${debugInfo.playlistSongsCount}songs)` : '❌'}
                | remaining:{debugInfo.remainingCount} | fullSong:{String(debugInfo.hasFullSong)} | chordpro:{String(debugInfo.hasChordpro)} | sections:{debugInfo.sectionsCount}
                | songId:{String(debugInfo.currentSongId)?.slice(0, 8)}
            </div>
            <div className="song-view" style={{ flex: 1, padding: '0 20px 20px', overflowY: 'auto' }}>
                <header style={{
                    position: 'sticky', top: -20, background: 'var(--bg-dark)',
                    zIndex: 10, padding: '10px 0 20px', borderBottom: '1px solid var(--border)',
                    marginBottom: 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                            <h1 className="song-title" style={{ fontSize: 20, color: 'var(--primary)' }}>
                                {currentSong.title || minimalSong?.title || 'Cargando...'}
                            </h1>
                            <p className="text-muted" style={{ fontSize: 13 }}>
                                {currentSong.author || minimalSong?.author || 'Autor desconocido'}
                            </p>
                        </div>
                        <div className="badge" style={{ background: 'var(--primary)', color: 'white', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', animation: 'pulse 1.5s infinite' }} />
                            EN VIVO
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div className="badge badge-primary" style={{ background: 'var(--primary)', padding: '6px 12px', fontSize: 14 }}>
                                {localKey || currentSong.custom_key || currentSong.song_key || 'N/A'}
                            </div>
                            <button className="btn btn-sm" style={{ padding: 6, background: 'var(--bg-input)', color: 'var(--text-primary)' }} onClick={() => transpose(-1)}><ChevronDown size={16} /></button>
                            <button className="btn btn-sm" style={{ padding: 6, background: 'var(--bg-input)', color: 'var(--text-primary)' }} onClick={() => transpose(1)}><ChevronUp size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: 12, color: 'var(--text-muted)', fontSize: 12 }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Clock size={14} /> {currentSong.bpm || minimalSong?.bpm || '--'} BPM
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Zap size={14} /> {currentSong.time_signature || minimalSong?.time_signature || '4/4'}
                            </span>
                        </div>
                    </div>
                </header>

                <div className="song-content" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* ── Current Song Sections ── */}
                    {sections.length > 0 ? sections.map((sec, i) => {
                        const isHighlighted = currentSectionLabel === sec.label;
                        const refKey = (currentSong?.song_id || 'current') + ':' + sec.label;
                        return (
                            <div
                                key={`current-${i}`}
                                ref={el => sectionRefs.current[refKey] = el}
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
                                    color: 'var(--text-primary)',
                                    fontWeight: 500
                                }}>
                                    {sec.content.split('\n').map((line, k) => (
                                        <ChordLine key={k} text={line} />
                                    ))}
                                </div>
                            </div>
                        );
                    }) : (
                        /* Fallback: show plain lyrics/title when no ChordPro */
                        <div className="card" style={{ margin: 0, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                            <div style={{
                                fontFamily: 'Inter', fontSize: 16,
                                color: 'var(--text-primary)', fontWeight: 500,
                                whiteSpace: 'pre-wrap', lineHeight: 1.8
                            }}>
                                {currentSong.title || 'Sin letra disponible'}
                            </div>
                        </div>
                    )}

                    {/* ── Remaining Songs – Continuous Flow ── */}
                    {remainingSongs.map((song, songIndex) => (
                        <RemainingSongEntry
                            key={song.song_id || `remaining-${songIndex}`}
                            song={song}
                            songIndex={songIndex}
                            sectionRefs={sectionRefs}
                        />
                    ))}
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
        </div>
    );
}
