import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ListMusic, Search, Edit2, Trash2, Music, GripVertical, X, ChevronUp, ChevronDown } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Playlists() {
    const qc = useQueryClient();
    const toast = useToast();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [addSongOpen, setAddSongOpen] = useState(false);
    const [form, setForm] = useState({ name: '', description: '' });

    const { data: playlists = [], isLoading } = useQuery({ queryKey: ['playlists'], queryFn: api.playlists.list });
    const { data: detail } = useQuery({
        queryKey: ['playlist', selectedId],
        queryFn: () => api.playlists.get(selectedId),
        enabled: !!selectedId,
    });
    const { data: allSongs = [] } = useQuery({ queryKey: ['songs', '', ''], queryFn: () => api.songs.list({}) });

    const createMut = useMutation({
        mutationFn: (d) => api.playlists.create(d),
        onSuccess: (pl) => { qc.invalidateQueries(['playlists']); setModalOpen(false); setSelectedId(pl.id); toast.success('Playlist creada'); setForm({ name: '', description: '' }); },
        onError: e => toast.error(e.message),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }) => api.playlists.update(id, data),
        onSuccess: () => { qc.invalidateQueries(['playlists']); qc.invalidateQueries(['playlist', selectedId]); setEditing(null); toast.success('Playlist actualizada'); },
        onError: e => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => api.playlists.delete(id),
        onSuccess: () => { qc.invalidateQueries(['playlists']); setDeleteTarget(null); if (selectedId === deleteTarget?.id) setSelectedId(null); toast.success('Playlist eliminada'); },
        onError: e => toast.error(e.message),
    });

    const addSongMut = useMutation({
        mutationFn: ({ pid, songId }) => api.playlists.addSong(pid, { song_id: songId }),
        onSuccess: () => { qc.invalidateQueries(['playlist', selectedId]); setAddSongOpen(false); toast.success('Canción agregada'); },
        onError: e => toast.error(e.message),
    });

    const removeSongMut = useMutation({
        mutationFn: ({ pid, entryId }) => api.playlists.removeSong(pid, entryId),
        onSuccess: () => { qc.invalidateQueries(['playlist', selectedId]); toast.success('Canción quitada'); },
        onError: e => toast.error(e.message),
    });

    const reorderMut = useMutation({
        mutationFn: ({ pid, order }) => api.playlists.reorder(pid, order),
        onSuccess: () => qc.invalidateQueries(['playlist', selectedId]),
    });

    const moveSong = (idx, dir) => {
        const songs = [...(detail?.songs || [])];
        const tmp = songs[idx]; songs[idx] = songs[idx + dir]; songs[idx + dir] = tmp;
        reorderMut.mutate({ pid: selectedId, order: songs.map(s => s.id) });
    };

    const selectedPlaylist = playlists.find(p => p.id === selectedId);
    const detailSongIds = new Set((detail?.songs || []).map(s => s.song_id));
    const availableSongs = allSongs.filter(s => !detailSongIds.has(s.id));

    return (
        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 60px - 48px)' }}>
            {/* Left: Playlist list */}
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h1 style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.4 }}>Playlists</h1>
                    <button className="btn btn-primary btn-sm" onClick={() => setModalOpen(true)}><Plus size={14} /> Nueva</button>
                </div>

                {isLoading ? <div className="loading-screen"><div className="spinner" /></div> :
                    playlists.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px 10px' }}>
                            <ListMusic size={32} />
                            <p>Crea tu primera playlist</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
                            {playlists.map(pl => (
                                <div
                                    key={pl.id}
                                    className="card"
                                    style={{ padding: '12px 16px', cursor: 'pointer', border: selectedId === pl.id ? '1px solid var(--primary)' : '1px solid var(--border)', background: selectedId === pl.id ? 'var(--primary-light)' : 'var(--bg-card)' }}
                                    onClick={() => setSelectedId(pl.id)}
                                >
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{pl.name}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span className="text-muted" style={{ fontSize: 12 }}>{pl.song_count} canciones</span>
                                        <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                            <button className="btn btn-ghost btn-icon" style={{ padding: 4 }} onClick={() => setEditing(pl)}><Edit2 size={12} /></button>
                                            <button className="btn btn-ghost btn-icon" style={{ padding: 4, color: 'var(--danger)' }} onClick={() => setDeleteTarget(pl)}><Trash2 size={12} /></button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                }
            </div>

            {/* Right: Playlist detail */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selectedId ? (
                    <div className="empty-state" style={{ height: '100%' }}>
                        <ListMusic size={48} />
                        <h3>Selecciona una playlist</h3>
                        <p>Haz clic en una playlist para ver y editar sus canciones</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <h2 style={{ fontSize: 20, fontWeight: 700 }}>{selectedPlaylist?.name}</h2>
                                <p className="text-muted">{selectedPlaylist?.description || 'Sin descripción'}</p>
                            </div>
                            <button className="btn btn-secondary" onClick={() => setAddSongOpen(true)}><Plus size={15} /> Agregar canción</button>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {!detail?.songs?.length ? (
                                <div className="empty-state">
                                    <Music size={32} />
                                    <h3>Playlist vacía</h3>
                                    <p>Agrega canciones desde tu biblioteca</p>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {detail.songs.map((s, i) => (
                                        <div key={s.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div className="text-muted" style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: 'center' }}>{i + 1}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                                                <div className="text-muted" style={{ fontSize: 12 }}>{s.author || '—'}</div>
                                            </div>
                                            <span className="chord-tag">{s.custom_key || s.song_key}</span>
                                            <span className="badge badge-muted">{s.bpm} BPM</span>
                                            <div style={{ display: 'flex', gap: 4 }}>
                                                {i > 0 && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveSong(i, -1)}><ChevronUp size={14} /></button>}
                                                {i < detail.songs.length - 1 && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => moveSong(i, 1)}><ChevronDown size={14} /></button>}
                                                <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }}
                                                    onClick={() => removeSongMut.mutate({ pid: selectedId, entryId: s.id })}>
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Playlist" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.name.trim()}>Crear</button>
                </>}>
                <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ej: Servicio Dominical" autoFocus />
                </div>
                <div className="form-group">
                    <label className="form-label">Descripción</label>
                    <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Opcional..." />
                </div>
            </Modal>

            {/* Edit Modal */}
            <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Playlist" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => updateMut.mutate({ id: editing.id, data: editing })}>Guardar</button>
                </>}>
                {editing && <>
                    <div className="form-group">
                        <label className="form-label">Nombre *</label>
                        <input className="form-input" value={editing.name} onChange={e => setEditing(v => ({ ...v, name: e.target.value }))} autoFocus />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <input className="form-input" value={editing.description || ''} onChange={e => setEditing(v => ({ ...v, description: e.target.value }))} />
                    </div>
                </>}
            </Modal>

            {/* Delete Modal */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar playlist" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={() => deleteMut.mutate(deleteTarget.id)}>Eliminar</button>
                </>}>
                <p className="text-muted">¿Eliminar <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</strong>?</p>
            </Modal>

            {/* Add Song Modal */}
            <Modal open={addSongOpen} onClose={() => setAddSongOpen(false)} title="Agregar canción a playlist" size="modal-sm">
                {availableSongs.length === 0 ? (
                    <div className="empty-state"><Music size={32} /><p>Todas las canciones ya están en esta playlist</p></div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
                        {availableSongs.map(s => (
                            <div key={s.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                                onClick={() => addSongMut.mutate({ pid: selectedId, songId: s.id })}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.title}</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>{s.author || '—'}</div>
                                </div>
                                <span className="chord-tag">{s.song_key}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}
