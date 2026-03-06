import React, { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';
import { connectWS, wsOn } from '../api';

export default function ProjectionDisplay() {
    const [slide, setSlide] = useState(null);
    const [isBlack, setIsBlack] = useState(false);
    const [config, setConfig] = useState({
        fontSize: 48, fontFamily: 'Inter', textColor: '#ffffff', bgColor: '#000000',
        textShadow: true, transition: 'fade', textAlign: 'center',
    });

    useEffect(() => {
        // Hide mouse cursor
        document.body.style.cursor = 'none';

        // Connect to WebSocket and listen for events
        connectWS(null, null, 'projection');

        const unsubSlide = wsOn('projection:slide', (data) => {
            setSlide(data);
            if (data.config) setConfig(data.config);
        });

        const unsubBlack = wsOn('projection:blackout', (data) => {
            setIsBlack(data.active);
        });

        const unsubConfig = wsOn('projection:config', (data) => {
            setConfig(prev => ({ ...prev, ...data }));
        });

        const unsubClear = wsOn('projection:clear', () => {
            setSlide(null);
        });

        const unsubStop = wsOn('live:stop', () => {
            window.close();
        });

        // Intentar pantalla completa automáticamente
        const enterFullscreen = () => {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => { });
            }
        };

        // Timeout para tratar de auto-lanzar localmente (fallback).
        setTimeout(enterFullscreen, 600);

        // Listener para recibir comando directo desde el padre que conserva el "user gesture" original.
        const msgListener = (e) => {
            if (e.data === 'force-fullscreen') enterFullscreen();
        };
        window.addEventListener('message', msgListener);

        // Listener de apoyo por si el usuario hace clic incidentalmente.
        document.addEventListener('click', enterFullscreen);

        return () => {
            document.body.style.cursor = 'default';
            document.removeEventListener('click', enterFullscreen);
            window.removeEventListener('message', msgListener);
            unsubSlide();
            unsubBlack();
            unsubConfig();
            unsubClear();
            unsubStop();
        };
    }, []);

    const containerStyle = {
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: config.textAlign === 'left' ? 'flex-start' : config.textAlign === 'right' ? 'flex-end' : 'center',
        justifyContent: 'center',
        padding: '40px 80px',
        overflow: 'hidden',
        position: 'relative',
    };

    const textStyle = {
        color: config.textColor,
        fontSize: `${config.fontSize}px`,
        fontFamily: config.fontFamily,
        fontWeight: 700,
        textAlign: config.textAlign,
        textShadow: config.textShadow ? '0 4px 12px rgba(0,0,0,0.8)' : 'none',
        whiteSpace: 'pre-wrap',
        lineHeight: 1.3,
        margin: 0,
        opacity: isBlack ? 0 : 1,
        transition: 'opacity 0.5s ease, font-size 0.3s ease',
        position: 'relative',
        zIndex: 10,
    };

    const footerStyle = {
        position: 'absolute',
        bottom: 40,
        left: 80,
        right: 80,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        opacity: (isBlack || !slide) ? 0 : 0.6,
        transition: 'opacity 0.5s ease',
        zIndex: 10,
    };



    return (
        <div style={containerStyle} onClick={() => {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(e => console.error(e));
            }
        }}>
            {/* Background Media */}
            {!isBlack && config.bgImage && <img src={`http://localhost:3000${config.bgImage}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}
            {!isBlack && config.bgVideo && <video src={`http://localhost:3000${config.bgVideo}`} autoPlay loop muted style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }} />}

            {/* Color Overlay */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1,
                backgroundColor: isBlack ? '#000000' : config.bgColor,
                opacity: isBlack ? 1 : (config.bgOpacity !== undefined ? config.bgOpacity : (config.bgImage || config.bgVideo ? 0.3 : 1)),
                transition: 'background-color 0.5s ease, opacity 0.5s ease'
            }} />

            {!isBlack && slide && (
                <>
                    <p style={textStyle}>
                        {slide.content || slide.label}
                    </p>

                    <div style={footerStyle}>
                        <div style={{ color: config.textColor, fontSize: '0.4em', opacity: 0.8 }}>
                            {slide.songTitle}
                        </div>
                        {slide.chords && slide.chords.length > 0 && (
                            <div style={{ display: 'flex', gap: 10 }}>
                                {slide.chords.map((c, i) => (
                                    <span key={i} style={{ color: 'var(--primary)', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: 4, fontWeight: 800, fontSize: '0.4em' }}>
                                        {c}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
