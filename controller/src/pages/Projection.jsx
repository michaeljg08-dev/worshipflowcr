import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Monitor, Play, Square, SkipBack, SkipForward, Moon,
    ChevronLeft, ChevronRight, Palette, Wifi, WifiOff, Check,
    Plus, Upload, Image as ImageIcon, Video
} from 'lucide-react';
import { api, wsSend, wsOn, connectWS } from '../api';
import { SECTION_TYPES } from '../constants';
import { useToast } from '../components/Toast';
import { parseChordPro } from '../utils/chordpro';

// ─── Built-in Themes ────────────────────────────────────────────────────────
const THEMES = [
    {
        id: 'dark',
        name: 'Oscuro Clásico',
        bgColor: '#000000',
        textColor: '#ffffff',
        fontSize: 48,
        fontFamily: 'Inter',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#000 60%,#1a1a2e)',
    },
    {
        id: 'midnight',
        name: 'Medianoche Azul',
        bgColor: '#0d1b2a',
        textColor: '#e8f4f8',
        fontSize: 48,
        fontFamily: 'Georgia',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#0d1b2a,#1a4a7a)',
    },
    {
        id: 'purple',
        name: 'Púrpura Profundo',
        bgColor: '#1b0533',
        textColor: '#f0e6ff',
        fontSize: 46,
        fontFamily: 'Inter',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#1b0533,#4a0a6e)',
    },
    {
        id: 'forest',
        name: 'Bosque Sagrado',
        bgColor: '#0a1f0a',
        textColor: '#d4f5d4',
        fontSize: 46,
        fontFamily: 'Georgia',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#0a1f0a,#1a4a1a)',
    },
    {
        id: 'sunset',
        name: 'Atardecer Dorado',
        bgColor: '#1a0a00',
        textColor: '#ffecd0',
        fontSize: 48,
        fontFamily: 'Georgia',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#3d1000,#8b3a00)',
    },
    {
        id: 'light',
        name: 'Luz del Día',
        bgColor: '#f5f5f0',
        textColor: '#1a1a2e',
        fontSize: 48,
        fontFamily: 'Inter',
        textAlign: 'center',
        textShadow: false,
        gradient: 'linear-gradient(135deg,#e8e8e0,#d0d0c8)',
    },
    {
        id: 'fire',
        name: 'Fuego Celestial',
        bgColor: '#1a0000',
        textColor: '#fff5e0',
        fontSize: 46,
        fontFamily: 'Impact',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#3d0000,#8b1a00)',
    },
    {
        id: 'ocean',
        name: 'Mar en Calma',
        bgColor: '#001a2e',
        textColor: '#e0f4ff',
        fontSize: 46,
        fontFamily: 'Georgia',
        textAlign: 'center',
        textShadow: true,
        gradient: 'linear-gradient(135deg,#001a2e,#003d6b)',
    },
];

// ─── Theme Customizer Modal ──────────────────────────────────────────────────
function ThemeCustomizer({ theme, onSave, onClose }) {
    const [draft, setDraft] = useState({ ...theme });
    const update = (k, v) => setDraft(d => ({ ...d, [k]: v }));

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)'
        }}>
            <div style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 20, padding: 28, width: 520, maxHeight: '90vh',
                overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.6)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2 style={{ fontWeight: 800, fontSize: 18 }}>✏️ Personalizar: {theme.name}</h2>
                    <button className="btn btn-secondary btn-sm" onClick={onClose}>✕ Cerrar</button>
                </div>

                {/* Live Preview */}
                <div style={{
                    width: '100%', aspectRatio: '16/9', borderRadius: 12,
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'center', marginBottom: 20, overflow: 'hidden',
                    border: '1px solid var(--border)', position: 'relative'
                }}>
                    {/* Background Media */}
                    {draft.bgImage && <img src={`http://localhost:3000${draft.bgImage}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
                    {draft.bgVideo && <video src={`http://localhost:3000${draft.bgVideo}`} autoPlay loop muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}

                    {/* Color Overlay */}
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 1,
                        background: draft.bgColor,
                        opacity: draft.bgOpacity !== undefined ? draft.bgOpacity : (draft.bgImage || draft.bgVideo ? 0.3 : 1)
                    }} />

                    <p style={{
                        fontFamily: draft.fontFamily, fontSize: Math.min(draft.fontSize * 0.5, 28),
                        color: draft.textColor, textAlign: draft.textAlign,
                        textShadow: draft.textShadow ? '0 2px 12px rgba(0,0,0,0.9)' : 'none',
                        padding: '0 20px', whiteSpace: 'pre-wrap',
                        position: 'relative', zIndex: 10
                    }}>
                        Cuán grande es Dios{'\n'}cántale, cuán grande es
                    </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="form-group">
                        <label className="form-label">Nombre del tema</label>
                        <input className="form-input" value={draft.name} onChange={e => update('name', e.target.value)} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Fondo Multimedia</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                <ImageIcon size={14} /> Subir Imagen
                                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                                    if (e.target.files[0]) {
                                        const r = await api.media.upload(e.target.files[0], 'image');
                                        update('bgImage', r.path); update('bgVideo', null); update('bgColor', '#000000');
                                    }
                                }} />
                            </label>
                            <label className="btn btn-secondary btn-sm" style={{ flex: 1, cursor: 'pointer', display: 'flex', justifyContent: 'center' }}>
                                <Video size={14} /> Subir Video
                                <input type="file" accept="video/mp4,video/webm" style={{ display: 'none' }} onChange={async e => {
                                    if (e.target.files[0]) {
                                        const r = await api.media.upload(e.target.files[0], 'video');
                                        update('bgVideo', r.path); update('bgImage', null); update('bgColor', '#000000');
                                    }
                                }} />
                            </label>
                        </div>
                        {(draft.bgImage || draft.bgVideo) && (
                            <button className="btn btn-sm" style={{ marginTop: 8, color: 'var(--danger)', fontSize: 11 }}
                                onClick={() => { update('bgImage', null); update('bgVideo', null); }}>
                                Quitar fondo multimedia
                            </button>
                        )}
                    </div>

                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Color de texto</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="color" value={draft.textColor} onChange={e => update('textColor', e.target.value)}
                                    style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-input)' }} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{draft.textColor}</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Color de fondo</label>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <input type="color" value={draft.bgColor} onChange={e => update('bgColor', e.target.value)}
                                    style={{ width: 40, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-input)' }} />
                                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{draft.bgColor}</span>
                            </div>
                        </div>
                    </div>

                    {(draft.bgImage || draft.bgVideo) && (
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <label className="form-label">Opacidad del color de fondo</label>
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                    {Math.round((draft.bgOpacity !== undefined ? draft.bgOpacity : 0.3) * 100)}%
                                </span>
                            </div>
                            <input type="range" min={0} max={1} step={0.05}
                                value={draft.bgOpacity !== undefined ? draft.bgOpacity : 0.3}
                                onChange={e => update('bgOpacity', Number(e.target.value))}
                                style={{ accentColor: 'var(--primary)' }} />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Tamaño de fuente: {draft.fontSize}px</label>
                        <input type="range" min={24} max={120} value={draft.fontSize}
                            onChange={e => update('fontSize', Number(e.target.value))}
                            style={{ accentColor: 'var(--primary)' }} />
                    </div>

                    <div className="form-row form-row-2">
                        <div className="form-group">
                            <label className="form-label">Tipografía</label>
                            <select className="form-select" value={draft.fontFamily} onChange={e => update('fontFamily', e.target.value)}>
                                {['Inter', 'Georgia', 'Times New Roman', 'Arial', 'Verdana', 'Impact'].map(f =>
                                    <option key={f} value={f}>{f}</option>
                                )}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Alineación</label>
                            <div style={{ display: 'flex', gap: 6 }}>
                                {['left', 'center', 'right'].map(a => (
                                    <button key={a} className={`btn btn-sm ${draft.textAlign === a ? 'btn-primary' : 'btn-secondary'}`}
                                        style={{ flex: 1 }} onClick={() => update('textAlign', a)}>
                                        {a === 'left' ? '⬤ Izq' : a === 'center' ? '⬤ Cen' : '⬤ Der'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="form-label" style={{ margin: 0 }}>Sombra de texto</label>
                        <button className={`btn btn-sm ${draft.textShadow ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => update('textShadow', !draft.textShadow)}>
                            {draft.textShadow ? 'ON' : 'OFF'}
                        </button>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => { onSave(draft); onClose(); }}>
                        <Check size={15} /> Guardar tema
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function Projection() {
    const toast = useToast();
    const [selectedPlaylistId, setSelectedPlaylistId] = useState('');
    const [currentSongIdx, setCurrentSongIdx] = useState(0);
    const [currentSlideIdx, setCurrentSlideIdx] = useState(0);
    const [isLive, setIsLive] = useState(false);
    const [isBlack, setIsBlack] = useState(false);
    const [wsConnected, setWsConnected] = useState(false);
    const [activeThemeId, setActiveThemeId] = useState('dark');
    const [customThemes, setCustomThemes] = useState({});
    const [editingTheme, setEditingTheme] = useState(null);
    const projWindowRef = useRef(null);
    const [screenDetails, setScreenDetails] = useState(null);

    // Precargar ScreenDetails si ya existe permiso para no perder el 'user gesture' al hacer click
    useEffect(() => {
        if ('permissions' in navigator && 'getScreenDetails' in window) {
            navigator.permissions.query({ name: 'window-management' }).then(status => {
                if (status.state === 'granted') {
                    window.getScreenDetails().then(setScreenDetails).catch(() => { });
                }
            });
        }
    }, []);

    const { data: allSettings } = useQuery({ queryKey: ['settings'], queryFn: api.settings.getAll });

    useEffect(() => {
        if (allSettings?.customThemes) {
            setCustomThemes(allSettings.customThemes);
        }
    }, [allSettings]);

    // Merge built-in with any user overrides/custom themes
    const themes = THEMES.map(t => customThemes[t.id] ? { ...t, ...customThemes[t.id] } : t);
    const customList = Object.values(customThemes).filter(t => !THEMES.some(baseTheme => baseTheme.id === t.id));
    themes.push(...customList);
    const config = themes.find(t => t.id === activeThemeId) || themes[0];

    const { data: playlists = [] } = useQuery({ queryKey: ['playlists'], queryFn: api.playlists.list });
    const { data: playlistDetail } = useQuery({
        queryKey: ['playlist', selectedPlaylistId],
        queryFn: () => api.playlists.get(selectedPlaylistId),
        enabled: !!selectedPlaylistId,
    });
    const songs = playlistDetail?.songs || [];
    const currentSong = songs[currentSongIdx];

    const { data: songDetail } = useQuery({
        queryKey: ['song', currentSong?.song_id],
        queryFn: () => api.songs.get(currentSong.song_id),
        enabled: !!currentSong?.song_id,
    });

    const slides = (() => {
        if (!songDetail?.chordpro) return songDetail?.sections || [];
        return parseChordPro(songDetail.chordpro).map(s => ({
            ...s,
            content: s.content.replace(/\[.*?\]/g, '')
        }));
    })();
    const currentSlide = slides[currentSlideIdx];

    useEffect(() => {
        connectWS(() => setWsConnected(true), () => setWsConnected(false));
    }, []);

    // Avisar al servidor cuando seleccionamos una playlist (pre-carga en los móviles)
    useEffect(() => {
        if (selectedPlaylistId) {
            wsSend('live:preselect', { playlistId: selectedPlaylistId });
        }
    }, [selectedPlaylistId]);

    const sendSlide = (slide, songInfo, theme) => {
        wsSend('projection:slide', {
            type: slide?.type, label: slide?.label, content: slide?.content,
            songTitle: songInfo?.title, songKey: songInfo?.song_key,
            config: theme,
        });
    };

    const goToSlide = (idx) => {
        const safe = Math.max(0, Math.min(idx, slides.length - 1));
        setCurrentSlideIdx(safe);
        if (isLive && !isBlack) sendSlide(slides[safe], currentSong, config);
    };

    const goToSong = (idx) => {
        const safe = Math.max(0, Math.min(idx, songs.length - 1));
        setCurrentSongIdx(safe);
        setCurrentSlideIdx(0);
        wsSend('live:song', { songIdx: safe, title: songs[safe]?.title, songDetails: songs[safe] });
    };

    const handleGoLive = () => {
        if (!currentSlide) { toast.error('Selecciona una canción y sección'); return; }

        if (!isLive) {
            const launchDisplay = (details) => {
                let isFullscreen = false;
                let winFeatures = 'menubar=no,toolbar=no,location=no,status=no,titlebar=no';

                if (details) {
                    const extScreen = details.screens.find(s => s !== details.currentScreen);
                    if (extScreen) {
                        winFeatures += `,left=${extScreen.left},top=${extScreen.top},width=${extScreen.width},height=${extScreen.height},fullscreen=yes,popup=yes`;
                        isFullscreen = true;
                    } else {
                        // Single screen detected - windowed mode
                        const w = 800; const h = 600;
                        const left = (window.screen.width / 2) - (w / 2);
                        const top = (window.screen.height / 2) - (h / 2);
                        winFeatures += `,width=${w},height=${h},left=${left},top=${top},popup=yes`;
                    }
                } else {
                    // No screen details API - windowed mode fallback
                    const w = 800; const h = 600;
                    const left = (window.screen.width / 2) - (w / 2);
                    const top = (window.screen.height / 2) - (h / 2);
                    winFeatures += `,width=${w},height=${h},left=${left},top=${top},popup=yes`;
                }

                const projWin = window.open('/display', 'projection-screen', winFeatures);
                projWindowRef.current = projWin;

                // Forzamos fullscreen con un retraso en chrome o esperamos el fallback interior SOLAMENTE si hay 2 pantallas
                // Window full screen logic ...
                if (isFullscreen) {
                    let attempts = 0;
                    const fsInterval = setInterval(() => {
                        if (projWin && !projWin.closed) projWin.postMessage('force-fullscreen', '*');
                        if (++attempts > 10) clearInterval(fsInterval);
                    }, 100);
                }
            };

            setIsLive(true);
            setIsBlack(false);
            wsSend('live:start', { playlistId: selectedPlaylistId, songIdx: currentSongIdx, songDetails: currentSong });
            if (currentSlide) sendSlide(currentSlide, currentSong, config);
            toast.info('Proyección en vivo iniciada');

            if (screenDetails) {
                launchDisplay(screenDetails);
            } else if ('getScreenDetails' in window) {
                window.getScreenDetails().then(details => {
                    setScreenDetails(details);
                    launchDisplay(details);
                }).catch(() => launchDisplay(null));
            } else {
                launchDisplay(null);
            }
        } else {
            setIsLive(false);
            setIsBlack(false);
            wsSend('live:stop', {});

            if (projWindowRef.current) {
                projWindowRef.current.close();
                projWindowRef.current = null;
            }
            toast.info('Proyección detenida');
        }
    };

    const handleBlackout = () => {
        setIsBlack(v => !v);
        wsSend('projection:blackout', { active: !isBlack });
    };

    const handleThemeSelect = (themeId) => {
        setActiveThemeId(themeId);
        const theme = themes.find(t => t.id === themeId);
        if (isLive && currentSlide) sendSlide(currentSlide, currentSong, theme);
        wsSend('projection:config', theme);
    };

    const handleSaveTheme = async (updated) => {
        const newThemes = { ...customThemes, [updated.id]: updated };
        setCustomThemes(newThemes);
        toast.success(`Tema "${updated.name}" guardado`);
        try {
            await api.settings.set('customThemes', newThemes);
        } catch (e) {
            toast.error('Error guardando en BD');
        }
    };

    const handleDuplicateTheme = () => {
        const id = 'custom_' + Date.now();
        setEditingTheme({ ...config, id, name: config.name + ' (Copia)' });
    };

    const handleDeleteTheme = async (id) => {
        if (THEMES.some(t => t.id === id)) return toast.error('No puedes borrar un tema base');
        const newThemes = { ...customThemes };
        delete newThemes[id];
        setCustomThemes(newThemes);
        if (activeThemeId === id) setActiveThemeId('dark');
        await api.settings.set('customThemes', newThemes);
        toast.success('Tema eliminado');
    };

    const sectionTypeColor = (type) => {
        const map = { chorus: '#6366f1', verse: '#10b981', bridge: '#f59e0b', intro: '#3b82f6', outro: '#ef4444', pre_chorus: '#8b5cf6', interlude: '#06b6d4' };
        return map[type] || '#64748b';
    };

    return (
        <div style={{ display: 'flex', height: '100%', gap: 0, overflow: 'hidden', background: 'var(--bg-base)' }}>

            {/* ── Col 1: Playlist + Song List ──────────────────── */}
            <div style={{
                width: 220, flexShrink: 0, borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)'
            }}>
                <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border)' }}>
                    <select className="form-select" style={{ fontSize: 13 }}
                        value={selectedPlaylistId}
                        onChange={e => { setSelectedPlaylistId(e.target.value); setCurrentSongIdx(0); setCurrentSlideIdx(0); }}>
                        <option value="">— Playlist —</option>
                        {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
                    {songs.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, marginTop: 24, padding: '0 12px' }}>
                            <Monitor size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                            <p>Selecciona una playlist</p>
                        </div>
                    ) : songs.map((s, i) => (
                        <div key={s.id} onClick={() => goToSong(i)} style={{
                            padding: '10px 12px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                            background: i === currentSongIdx ? 'rgba(99,102,241,0.15)' : 'transparent',
                            border: `1px solid ${i === currentSongIdx ? 'rgba(99,102,241,0.4)' : 'transparent'}`,
                            transition: 'all 0.15s',
                        }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: i === currentSongIdx ? 'var(--primary)' : 'var(--text-primary)', lineHeight: 1.3 }}>
                                {i + 1}. {s.title}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.song_key} • {s.author || 'Desconocido'}</div>
                        </div>
                    ))}
                </div>


            </div>

            {/* ── Col 2: Preview + Slides ──────────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                {/* Preview */}
                <div style={{
                    height: 220, flexShrink: 0, background: isBlack ? '#000' : config.bgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border)'
                }}>
                    {isBlack ? (
                        <span style={{ color: '#444', fontSize: 14, letterSpacing: 2 }}>■ PANTALLA NEGRA</span>
                    ) : currentSlide ? (
                        <p style={{
                            fontFamily: config.fontFamily, fontSize: Math.min(config.fontSize * 0.5, 26),
                            color: config.textColor, textAlign: config.textAlign,
                            textShadow: config.textShadow ? '0 2px 10px rgba(0,0,0,0.9)' : 'none',
                            padding: '0 32px', whiteSpace: 'pre-wrap', lineHeight: 1.5,
                            maxWidth: 700,
                        }}>
                            {currentSlide.content || currentSlide.label}
                        </p>
                    ) : (
                        <span style={{ color: '#555', fontSize: 13 }}>Sin contenido seleccionado</span>
                    )}
                    {isLive && !isBlack && (
                        <div style={{ position: 'absolute', top: 10, right: 12 }}>
                            <div className="live-badge"><div className="live-dot" /> LIVE</div>
                        </div>
                    )}
                    {currentSong && (
                        <div style={{ position: 'absolute', bottom: 10, left: 14, fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>
                            {currentSong.title} {currentSong.song_key ? `• ${currentSong.song_key}` : ''}
                        </div>
                    )}
                </div>

                {/* Transport Controls */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
                    borderBottom: '1px solid var(--border)', flexShrink: 0,
                    background: 'var(--bg-surface)'
                }}>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => goToSong(currentSongIdx - 1)} disabled={currentSongIdx === 0} title="Canción anterior"><SkipBack size={14} /></button>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => goToSlide(currentSlideIdx - 1)} disabled={currentSlideIdx === 0} title="Slide anterior"><ChevronLeft size={14} /></button>
                    <button
                        className={`btn btn-${isLive ? 'danger' : 'success'}`}
                        style={{ minWidth: 130, fontWeight: 700 }}
                        onClick={handleGoLive}
                        disabled={!selectedPlaylistId || songs.length === 0}
                    >
                        {isLive ? <><Square size={13} /> Detener</> : <><Play size={13} /> Iniciar Live</>}
                    </button>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => goToSlide(currentSlideIdx + 1)} disabled={currentSlideIdx >= slides.length - 1} title="Siguiente slide"><ChevronRight size={14} /></button>
                    <button className="btn btn-secondary btn-icon btn-sm" onClick={() => goToSong(currentSongIdx + 1)} disabled={currentSongIdx >= songs.length - 1} title="Siguiente canción"><SkipForward size={14} /></button>
                    <div style={{ flex: 1 }} />
                    <button
                        className={`btn btn-sm ${isBlack ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={handleBlackout}
                    >
                        <Moon size={13} /> {isBlack ? 'Restaurar' : 'Pantalla negra'}
                    </button>
                </div>

                {/* Slides Grid */}
                <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
                    {slides.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 40, fontSize: 13 }}>
                            {selectedPlaylistId ? 'Selecciona una canción de la lista' : 'Selecciona una playlist para comenzar'}
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
                            {slides.map((slide, i) => {
                                const isActive = i === currentSlideIdx;
                                const color = sectionTypeColor(slide.type);
                                return (
                                    <div
                                        key={i}
                                        onClick={() => goToSlide(i)}
                                        style={{
                                            background: isActive ? config.bgColor : 'rgba(255,255,255,0.03)',
                                            border: `2px solid ${isActive ? color : 'var(--border)'}`,
                                            borderRadius: 12, cursor: 'pointer',
                                            overflow: 'hidden', transition: 'all 0.15s',
                                            boxShadow: isActive ? `0 0 16px ${color}55` : 'none',
                                            aspectRatio: '16/9',
                                            display: 'flex', flexDirection: 'column',
                                        }}
                                    >
                                        {/* Section label bar */}
                                        <div style={{
                                            padding: '4px 8px', background: color + (isActive ? 'ff' : '33'),
                                            fontSize: 10, fontWeight: 700, color: isActive ? '#fff' : color,
                                            letterSpacing: 0.5, textTransform: 'uppercase'
                                        }}>
                                            {slide.label}
                                        </div>
                                        {/* Content preview */}
                                        <div style={{
                                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            padding: '6px 10px',
                                            fontFamily: config.fontFamily, fontSize: 9,
                                            color: isActive ? config.textColor : 'var(--text-secondary)',
                                            textAlign: config.textAlign, whiteSpace: 'pre-wrap', lineHeight: 1.4,
                                            overflow: 'hidden'
                                        }}>
                                            {(slide.content || '').slice(0, 120)}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Col 3: Theme Gallery ─────────────────────────── */}
            <div style={{
                width: 190, flexShrink: 0, borderLeft: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)'
            }}>
                <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Palette size={14} color="var(--primary)" />
                        <span style={{ fontSize: 13, fontWeight: 700 }}>Temas</span>
                    </div>
                    <button className="btn btn-icon btn-sm" onClick={handleDuplicateTheme} title="Nuevo tema desde el actual">
                        <Plus size={14} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {themes.map(theme => {
                        const isSelected = theme.id === activeThemeId;
                        return (
                            <div key={theme.id} style={{ position: 'relative' }}>
                                {/* Thumbnail */}
                                <div
                                    onClick={() => handleThemeSelect(theme.id)}
                                    style={{
                                        background: theme.gradient || theme.bgColor,
                                        borderRadius: 10,
                                        aspectRatio: '16/9',
                                        cursor: 'pointer',
                                        border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                                        boxShadow: isSelected ? '0 0 14px var(--primary-glow)' : 'none',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        overflow: 'hidden', transition: 'all 0.2s',
                                        position: 'relative',
                                    }}
                                >
                                    {theme.bgImage && <img src={`http://localhost:3000${theme.bgImage}`} style={{ position: 'absolute', width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />}
                                    {theme.bgVideo && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Video size={16} color="rgba(255,255,255,0.8)" /></div>}
                                    <span style={{
                                        fontFamily: theme.fontFamily, fontSize: 9,
                                        color: theme.textColor, textAlign: 'center',
                                        textShadow: theme.textShadow ? '0 1px 4px rgba(0,0,0,0.8)' : 'none',
                                        padding: '0 6px', lineHeight: 1.4, position: 'relative', zIndex: 10
                                    }}>
                                        Cuán grande es Dios
                                    </span>
                                    {isSelected && (
                                        <div style={{
                                            position: 'absolute', top: 4, right: 4, zIndex: 11,
                                            background: 'var(--primary)', borderRadius: '50%',
                                            width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <Check size={10} color="#fff" />
                                        </div>
                                    )}
                                </div>
                                {/* Theme name + edit */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: '0 2px' }}>
                                    <span style={{ fontSize: 11, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', fontWeight: isSelected ? 700 : 400 }}>
                                        {theme.name}
                                    </span>
                                    <div style={{ display: 'flex' }}>
                                        <button onClick={() => setEditingTheme(theme)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', cursor: 'pointer', padding: '0 4px' }} title="Personalizar">✏️</button>
                                        {theme.id.startsWith('custom_') && (
                                            <button onClick={() => handleDeleteTheme(theme.id)} style={{ fontSize: 10, color: 'var(--danger)', background: 'none', cursor: 'pointer', padding: '0 4px' }} title="Eliminar">❌</button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Theme Customizer Modal */}
            {editingTheme && (
                <ThemeCustomizer
                    theme={editingTheme}
                    onSave={handleSaveTheme}
                    onClose={() => setEditingTheme(null)}
                />
            )}

        </div>
    );
}
