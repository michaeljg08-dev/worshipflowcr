import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radio, Square, Monitor } from 'lucide-react';
import { wsOn, wsSend } from '../api';

/**
 * Global floating indicator that shows the live projection status.
 * Visible from ALL pages in the controller.
 * - When LIVE: shows a glowing red badge with the current song + "Detener" button
 * - When NOT LIVE: shows a subtle "Ir a Proyección" shortcut
 */
export default function LiveIndicator() {
    const navigate = useNavigate();
    const [liveState, setLiveState] = useState({ isActive: false, playlistId: null, songIdx: null, item: null });

    useEffect(() => {
        const unsub = wsOn('live:state', (state) => {
            setLiveState(state || { isActive: false, playlistId: null, songIdx: null, item: null });
        });
        return unsub;
    }, []);

    const handleStop = (e) => {
        e.stopPropagation();
        wsSend('live:stop', {});
        setLiveState({ isActive: false, playlistId: null, songIdx: null, item: null });
    };

    const isLive = liveState?.isActive && liveState?.item;
    const songTitle = isLive && liveState.item.type === 'song'
        ? liveState.item.data?.title
        : isLive && liveState.item.type === 'bible'
            ? liveState.item.data?.title
            : null;

    if (!isLive) {
        // Subtle shortcut to Projection page
        return (
            <div
                onClick={() => navigate('/projection')}
                style={{
                    position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 14, padding: '10px 16px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s',
                    opacity: 0.7
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
            >
                <Monitor size={16} color="var(--text-muted)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>
                    Ir a Proyección
                </span>
            </div>
        );
    }

    // LIVE indicator
    return (
        <div style={{
            position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
            background: 'linear-gradient(135deg, #1a0000, #2d0000)',
            border: '1px solid rgba(239,68,68,0.4)',
            borderRadius: 16, padding: '12px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            boxShadow: '0 4px 30px rgba(239,68,68,0.25), 0 0 60px rgba(239,68,68,0.1)',
            animation: 'liveGlow 2s ease-in-out infinite',
            minWidth: 220
        }}>
            {/* Pulsing dot */}
            <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 12px #ef4444',
                animation: 'livePulse 1.5s infinite',
                flexShrink: 0
            }} />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 10, fontWeight: 800, color: '#ef4444',
                    letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 2
                }}>
                    EN VIVO
                </div>
                {songTitle && (
                    <div style={{
                        fontSize: 13, fontWeight: 600, color: '#fca5a5',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                        {songTitle}
                    </div>
                )}
            </div>

            {/* Go to Projection */}
            <button
                onClick={(e) => { e.stopPropagation(); navigate('/projection'); }}
                style={{
                    background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 8, padding: '6px 8px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fca5a5', transition: 'all 0.15s'
                }}
                title="Ir a Proyección"
            >
                <Monitor size={16} />
            </button>

            {/* Stop button */}
            <button
                onClick={handleStop}
                style={{
                    background: '#ef4444', border: 'none',
                    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: 'white', fontWeight: 700, fontSize: 11,
                    transition: 'all 0.15s',
                    boxShadow: '0 2px 8px rgba(239,68,68,0.4)'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
            >
                <Square size={12} />
                Detener
            </button>

            <style>{`
                @keyframes livePulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(0.85); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes liveGlow {
                    0% { box-shadow: 0 4px 30px rgba(239,68,68,0.25), 0 0 60px rgba(239,68,68,0.1); }
                    50% { box-shadow: 0 4px 40px rgba(239,68,68,0.35), 0 0 80px rgba(239,68,68,0.15); }
                    100% { box-shadow: 0 4px 30px rgba(239,68,68,0.25), 0 0 60px rgba(239,68,68,0.1); }
                }
            `}</style>
        </div>
    );
}
