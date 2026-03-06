import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wifi, ArrowLeft, Save, RefreshCw, AlertCircle, Share2, Smartphone } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function NetworkSettings() {
    const navigate = useNavigate();
    const [ip, setIp] = useState(localStorage.getItem('server_ip') || '');
    const [status, setStatus] = useState('idle'); // idle, testing, success, error

    const handleSave = () => {
        localStorage.setItem('server_ip', ip);
        // Reload to apply new IP to SyncManager and WebSocket
        window.location.reload();
    };

    const testConnection = async () => {
        setStatus('testing');
        const testIp = ip || 'localhost';
        try {
            const res = await fetch(`http://${testIp}:3000/api/status`).then(r => r.json());
            if (res.status === 'running') {
                setStatus('success');
            } else {
                setStatus('error');
            }
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="network-settings-page">
            <header style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                <button className="btn" style={{ padding: 8, background: 'var(--bg-input)' }} onClick={() => navigate(-1)}>
                    <ArrowLeft size={20} />
                </button>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>Configuración de Red</h1>
            </header>

            <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div style={{ padding: 10, background: 'rgba(99,102,241,0.2)', color: 'var(--primary)', borderRadius: 10 }}>
                        <Wifi size={24} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Servidor Maestro</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>IP del PC controlador en la red local</p>
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 600 }}>Dirección IP</label>
                    <input
                        type="text"
                        className="btn"
                        style={{ width: '100%', textAlign: 'left', padding: '12px 16px', fontSize: 16, background: 'var(--bg-input)' }}
                        placeholder="Ej: 192.168.1.50"
                        value={ip}
                        onChange={(e) => setIp(e.target.value)}
                    />
                    <p style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                        Deja vacío para usar 'localhost' (solo desarrollo local).
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button className="btn" style={{ background: 'var(--bg-input)', width: '100%' }} onClick={testConnection} disabled={status === 'testing'}>
                        <RefreshCw size={18} style={{ marginRight: 8, animation: status === 'testing' ? 'spin 1s linear infinite' : 'none' }} />
                        Probar
                    </button>
                    <button className="btn" style={{ background: 'var(--primary)', color: 'white', width: '100%' }} onClick={handleSave}>
                        <Save size={18} style={{ marginRight: 8 }} />
                        Guardar
                    </button>
                </div>

                {status === 'success' && (
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(16,185,129,0.15)', color: 'var(--success)', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <RefreshCw size={16} /> ¡Conexión exitosa!
                    </div>
                )}

                {status === 'error' && (
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', borderRadius: 8, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertCircle size={16} /> No se pudo conectar al servidor.
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: 24, padding: 20, background: 'rgba(255,255,255,0.05)', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Smartphone size={20} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: 16 }}>Compartir Conexión</span>
                </div>
                <div style={{ background: 'white', padding: 16, borderRadius: 16, marginBottom: 12 }}>
                    <QRCode
                        value={`http://${ip || window.location.hostname}:3000/mobile`}
                        size={180}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="L"
                    />
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', userSelect: 'all' }}>
                    http://{ip || window.location.hostname}:3000/mobile
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                    Muestra este código a otro miembro para que se conecte
                </div>
            </div>

            <div className="card" style={{ marginTop: 24, borderStyle: 'dashed' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>¿Cómo encontrar la IP?</h3>
                <ol style={{ paddingLeft: 20, fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                    <li>En el PC del Director, abre la terminal.</li>
                    <li>Escribe <code>ipconfig</code> y presiona Enter.</li>
                    <li>Busca "Dirección IPv4" (ej: 192.168.X.X).</li>
                    <li>Asegúrate de que este móvil esté en la misma red Wi-Fi.</li>
                </ol>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
