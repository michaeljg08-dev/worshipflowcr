import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Type, Image, AlignLeft, Smartphone, Shield, HardDrive, MonitorPlay, Save, Database, Wifi, Server, Settings as SettingsIcon, Share2, Globe, Monitor } from 'lucide-react';
import QRCode from 'react-qr-code';
import { api } from '../api';
import { useToast } from '../components/Toast';

export default function Settings() {
    const toast = useToast();
    const [projConfig, setProjConfig] = useState(null);
    const [generalConfig, setGeneralConfig] = useState(null);
    const { data: status } = useQuery({ queryKey: ['status'], queryFn: api.status });

    useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
        onSuccess: (d) => {
            setProjConfig(d.projection || {});
            setGeneralConfig(d.general || {});
        },
    });

    const { data: allSettings } = useQuery({
        queryKey: ['settings'],
        queryFn: api.settings.getAll,
    });

    const pConfig = projConfig || allSettings?.projection || {};
    const gConfig = generalConfig || allSettings?.general || {};

    const saveMut = useMutation({
        mutationFn: async () => {
            await api.settings.set('projection', projConfig || pConfig);
            await api.settings.set('general', generalConfig || gConfig);
        },
        onSuccess: () => toast.success('Ajustes guardados'),
        onError: e => toast.error(e.message),
    });

    const setP = (k, v) => setProjConfig(c => ({ ...pConfig, ...c, [k]: v }));
    const setG = (k, v) => setGeneralConfig(c => ({ ...gConfig, ...c, [k]: v }));

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Ajustes</h1>
                    <p className="text-muted">Configuración global del sistema</p>
                </div>
                <button className="btn btn-primary" onClick={() => saveMut.mutate()}><Save size={15} /> Guardar cambios</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* General */}
                <div className="card">
                    <div className="card-header"><span className="card-title"><Globe size={16} />General</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Nombre de la Iglesia</label>
                            <input className="form-input" value={gConfig.churchName || ''} onChange={e => setG('churchName', e.target.value)} placeholder="Mi Iglesia" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Idioma</label>
                            <select className="form-select" value={gConfig.language || 'es'} onChange={e => setG('language', e.target.value)}>
                                <option value="es">Español</option>
                                <option value="en">English</option>
                                <option value="pt">Português</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Projection defaults */}
                <div className="card">
                    <div className="card-header"><span className="card-title"><Monitor size={16} />Proyección (defaults)</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="form-group">
                            <label className="form-label">Tamaño de fuente por defecto</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="range" min={24} max={120} value={pConfig.fontSize || 48} onChange={e => setP('fontSize', Number(e.target.value))}
                                    style={{ flex: 1, accentColor: 'var(--primary)' }} />
                                <span style={{ minWidth: 36, fontSize: 12, color: 'var(--text-muted)' }}>{pConfig.fontSize || 48}px</span>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fuente por defecto</label>
                            <select className="form-select" value={pConfig.fontFamily || 'Inter'} onChange={e => setP('fontFamily', e.target.value)}>
                                {['Inter', 'Georgia', 'Times New Roman', 'Arial', 'Verdana', 'Impact'].map(f => <option key={f}>{f}</option>)}
                            </select>
                        </div>
                        <div className="form-row form-row-2">
                            <div className="form-group">
                                <label className="form-label">Color texto</label>
                                <input type="color" value={pConfig.textColor || '#ffffff'} onChange={e => setP('textColor', e.target.value)}
                                    style={{ width: '100%', height: 38, borderRadius: 6, border: '1px solid var(--border)', padding: 2, background: 'var(--bg-input)', cursor: 'pointer' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Color fondo</label>
                                <input type="color" value={pConfig.bgColor || '#000000'} onChange={e => setP('bgColor', e.target.value)}
                                    style={{ width: '100%', height: 38, borderRadius: 6, border: '1px solid var(--border)', padding: 2, background: 'var(--bg-input)', cursor: 'pointer' }} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <label className="form-label" style={{ margin: 0 }}>Sombra de texto</label>
                            <button className={`btn btn-sm ${pConfig.textShadow ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setP('textShadow', !pConfig.textShadow)}>
                                {pConfig.textShadow ? 'ON' : 'OFF'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Server Info */}
                <div className="card">
                    <div className="card-header"><span className="card-title"><Server size={16} />Información del servidor</span></div>
                    {status ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <div style={{
                                padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12,
                                display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 10,
                                border: '1px solid var(--border)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                    <Smartphone size={20} style={{ color: 'var(--primary)' }} />
                                    <span style={{ fontWeight: 600, fontSize: 16 }}>Acceso Móvil</span>
                                </div>
                                <div style={{ background: 'white', padding: 16, borderRadius: 16, marginBottom: 12 }}>
                                    <QRCode
                                        value={`http://${status.lanIp || window.location.hostname}:3000/mobile`}
                                        size={180}
                                        bgColor="#ffffff"
                                        fgColor="#000000"
                                        level="L"
                                    />
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', userSelect: 'all' }}>
                                    http://{status.lanIp || window.location.hostname}:3000/mobile
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                                    Escanea de este código para abrir la app móvil en la misma red Wi-Fi
                                </div>
                            </div>
                            {[
                                ['Estado', <span className="badge badge-success">En línea</span>],
                                ['Versión', status.version],
                                ['API REST', `http://${status.lanIp || window.location.hostname}:3000/api`],
                                ['WebSocket', `ws://${status.lanIp || window.location.hostname}:3000/ws`],
                                ['Clientes conectados', status.clients],
                                ['Tiempo activo', `${Math.floor(status.uptime / 60)}m ${Math.floor(status.uptime % 60)}s`],
                            ].map(([label, val]) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                                    <span className="text-muted">{label}</span>
                                    <span style={{ fontFamily: typeof val === 'string' && val.startsWith('http') ? 'var(--font-mono)' : 'inherit', fontSize: 12 }}>{val}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-muted">No se puede conectar al servidor en localhost:3000</p>
                    )}
                </div>

                {/* About */}
                <div className="card">
                    <div className="card-header"><span className="card-title"><SettingsIcon size={16} />Acerca de WorshipFlow</span></div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
                            <div style={{ width: 48, height: 48, background: 'linear-gradient(135deg, var(--primary), var(--accent))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                                🎵
                            </div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 16 }}>WorshipFlow</div>
                                <div className="text-muted" style={{ fontSize: 12 }}>Sistema integral de proyección y ensayo musical</div>
                            </div>
                        </div>
                        <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
                            Plataforma modular offline-first para gestión y proyección de canciones en eventos en vivo. Incluye controlador PC, pantalla de proyección y app móvil PWA para músicos.
                        </p>
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                            <span className="badge badge-primary">v1.0.0</span>
                            <span className="badge badge-muted">React + Vite</span>
                            <span className="badge badge-muted">Node.js + SQLite</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
