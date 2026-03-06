import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Music, Edit2, Trash2, ChevronsUpDown, Tag, GripVertical, ChevronDown, ChevronUp, X } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { SECTION_TYPES, KEYS, CATEGORIES } from '../constants';

// ─── ChordPro Editor ──────────────────────────────────────────
function ChordProEditor({ value, onChange }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="alert alert-info" style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid rgba(99,102,241,0.2)' }}>
                <strong>Sintaxis ChordPro:</strong> Escribe los acordes entre corchetes <code>[C]</code> antes de la sílaba. Usa <code>{"{c: Verso 1}"}</code> para nombrar las secciones de tu canción.
            </div>
            <textarea
                className="form-textarea"
                rows={16}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 14, lineHeight: 1.6, padding: 16 }}
                placeholder="{c: Verso 1}\\n[C]Oh [G]Dios, mi [Am]Dios..."
                value={value}
                onChange={e => onChange(e.target.value)}
            />
        </div>
    );
}

// ─── Song Form ────────────────────────────────────────────────
function SongForm({ initial, onSave, onClose }) {
    const [form, setForm] = useState(() => initial || {
        title: '', author: '', song_key: 'C', bpm: 120, time_signature: '4/4', category: '', notes: '',
        chordpro: ''
    });

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const handleSave = () => {
        if (!form.title.trim()) return;
        onSave(form);
    };

    return (
        <>
            <div className="form-row form-row-2">
                <div className="form-group">
                    <label className="form-label">Título *</label>
                    <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Grande es tu Fidelidad" autoFocus />
                </div>
                <div className="form-group">
                    <label className="form-label">Autor / Compositor</label>
                    <input className="form-input" value={form.author} onChange={e => set('author', e.target.value)} placeholder="Autor" />
                </div>
            </div>
            <div className="form-row form-row-3">
                <div className="form-group">
                    <label className="form-label">Tonalidad</label>
                    <select className="form-select" value={form.song_key} onChange={e => set('song_key', e.target.value)}>
                        {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">BPM</label>
                    <input className="form-input" type="number" value={form.bpm} onChange={e => set('bpm', Number(e.target.value))} min={40} max={300} />
                </div>
                <div className="form-group">
                    <label className="form-label">Categoría</label>
                    <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                        <option value="">Sin categoría</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Notas</label>
                <input className="form-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas adicionales..." />
            </div>
            <div className="divider" />
            <div>
                <label className="form-label" style={{ display: 'block', marginBottom: 12 }}>Letra y Acordes (ChordPro)</label>
                <ChordProEditor value={form.chordpro || ''} onChange={v => set('chordpro', v)} />
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={!form.title.trim()}>
                    Guardar canción
                </button>
            </div>
        </>
    );
}

// ─── Main Songs Page ─────────────────────────────────────────
export default function Songs() {
    const qc = useQueryClient();
    const toast = useToast();
    const [search, setSearch] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [viewSong, setViewSong] = useState(null);

    const { data: songs = [], isLoading } = useQuery({
        queryKey: ['songs', search, catFilter],
        queryFn: () => api.songs.list({ search, category: catFilter }),
    });

    const { data: detail } = useQuery({
        queryKey: ['song', viewSong?.id || editing?.id],
        queryFn: () => api.songs.get(viewSong?.id || editing?.id),
        enabled: !!(viewSong?.id || editing?.id),
    });

    const createMut = useMutation({
        mutationFn: (data) => api.songs.create(data),
        onSuccess: () => { qc.invalidateQueries(['songs']); setModalOpen(false); toast.success('Canción creada'); },
        onError: (e) => toast.error(e.message),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }) => api.songs.update(id, data),
        onSuccess: () => { qc.invalidateQueries(['songs']); setEditing(null); toast.success('Canción actualizada'); },
        onError: (e) => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => api.songs.delete(id),
        onSuccess: () => { qc.invalidateQueries(['songs']); setDeleteTarget(null); toast.success('Canción eliminada'); },
        onError: (e) => toast.error(e.message),
    });

    const transposeMut = useMutation({
        mutationFn: ({ id, semitones }) => api.songs.transpose(id, semitones),
        onSuccess: (d) => { qc.invalidateQueries(['songs']); toast.success(`Transpuesta a ${d.newKey}`); },
        onError: (e) => toast.error(e.message),
    });

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Canciones</h1>
                    <p className="text-muted">{songs.length} canciones en tu biblioteca</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                    <Plus size={16} /> Nueva canción
                </button>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                <div className="search-bar" style={{ flex: 1 }}>
                    <Search size={15} />
                    <input placeholder="Buscar por título o autor..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-select" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                    <option value="">Todas las categorías</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            {/* Table */}
            {isLoading ? (
                <div className="loading-screen"><div className="spinner" /><span>Cargando canciones...</span></div>
            ) : songs.length === 0 ? (
                <div className="empty-state">
                    <Music size={48} />
                    <h3>No hay canciones</h3>
                    <p>Agrega tu primera canción usando el botón "Nueva canción"</p>
                </div>
            ) : (
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Canción</th>
                                <th>Tonalidad</th>
                                <th>BPM</th>
                                <th>Categoría</th>
                                <th style={{ width: 160 }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {songs.map(song => (
                                <tr key={song.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{song.title}</div>
                                        <div className="text-muted" style={{ fontSize: 12 }}>{song.author || '—'}</div>
                                    </td>
                                    <td><span className="chord-tag">{song.song_key}</span></td>
                                    <td><span className="text-muted">{song.bpm}</span></td>
                                    <td>{song.category ? <span className="badge badge-primary">{song.category}</span> : <span className="text-muted">—</span>}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button className="btn btn-ghost btn-icon btn-sm" title="Ver detalles" onClick={() => setViewSong(song)}><Music size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" title="Editar" onClick={() => setEditing(song)}><Edit2 size={14} /></button>
                                            <button className="btn btn-ghost btn-icon btn-sm" title="Transponer +1" onClick={() => transposeMut.mutate({ id: song.id, semitones: 1 })}>
                                                <ChevronsUpDown size={14} />
                                            </button>
                                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} title="Eliminar" onClick={() => setDeleteTarget(song)}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Canción" size="modal-xl">
                <SongForm onSave={(data) => createMut.mutate(data)} onClose={() => setModalOpen(false)} />
            </Modal>

            {/* Edit Modal */}
            <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Canción" size="modal-xl">
                {editing && detail && detail.id === editing.id ? (
                    <SongForm initial={detail} onSave={(data) => updateMut.mutate({ id: editing.id, data })} onClose={() => setEditing(null)} />
                ) : (
                    <div className="loading-screen" style={{ height: 200 }}><div className="spinner" /><span>Cargando detalle...</span></div>
                )}
            </Modal>

            {/* Detail Modal */}
            <Modal open={!!viewSong} onClose={() => setViewSong(null)} title={viewSong?.title || ''} size="modal-lg">
                {detail && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <span className="chord-tag">{detail.song_key}</span>
                            <span className="badge badge-muted">{detail.bpm} BPM</span>
                            {detail.category && <span className="badge badge-primary">{detail.category}</span>}
                            {detail.author && <span className="text-muted" style={{ fontSize: 13 }}>Por {detail.author}</span>}
                        </div>
                        <div style={{
                            background: 'var(--bg-card)',
                            border: '1px solid var(--border)',
                            borderRadius: 'var(--radius)',
                            padding: 20,
                            maxHeight: '60vh',
                            overflowY: 'auto'
                        }}>
                            <pre style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: 14,
                                lineHeight: 1.7,
                                color: 'var(--text-primary)',
                                whiteSpace: 'pre-wrap',
                                margin: 0
                            }}>
                                {detail.chordpro || 'Sin letra'}
                            </pre>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Delete Confirm */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar canción" size="modal-sm">
                <p style={{ color: 'var(--text-secondary)' }}>
                    ¿Seguro que deseas eliminar <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.title}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={() => deleteMut.mutate(deleteTarget.id)}>Eliminar</button>
                </div>
            </Modal>
        </div>
    );
}
