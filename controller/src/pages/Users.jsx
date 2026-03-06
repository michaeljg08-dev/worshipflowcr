import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users as UsersIcon, Plus, Edit2, Trash2 } from 'lucide-react';
import { api } from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

const INSTRUMENTS = ['Guitarra', 'Bajo', 'Batería', 'Teclado', 'Piano', 'Voz', 'Violín', 'Trompeta', 'Saxofón', 'Flauta', 'Dirección', 'Sonido', 'Otro'];
const AVATAR_COLORS = ['#6366f1', '#a78bfa', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#06b6d4', '#84cc16'];
const ROLES = [{ value: 'admin', label: 'Administrador' }, { value: 'musician', label: 'Músico' }, { value: 'viewer', label: 'Espectador' }];

const emptyForm = () => ({ name: '', instrument: '', role: 'musician', avatar_color: '#6366f1' });

export default function Users() {
    const qc = useQueryClient();
    const toast = useToast();
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [form, setForm] = useState(emptyForm());

    const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: api.users.list });
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const createMut = useMutation({
        mutationFn: (d) => api.users.create(d),
        onSuccess: () => { qc.invalidateQueries(['users']); setModalOpen(false); setForm(emptyForm()); toast.success('Músico agregado'); },
        onError: e => toast.error(e.message),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }) => api.users.update(id, data),
        onSuccess: () => { qc.invalidateQueries(['users']); setEditing(null); toast.success('Músico actualizado'); },
        onError: e => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => api.users.delete(id),
        onSuccess: () => { qc.invalidateQueries(['users']); setDeleteTarget(null); toast.success('Músico eliminado'); },
        onError: e => toast.error(e.message),
    });

    const FormContent = ({ data, onChange }) => (
        <>
            <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" value={data.name} onChange={e => onChange('name', e.target.value)} placeholder="Nombre completo" autoFocus />
            </div>
            <div className="form-row form-row-2">
                <div className="form-group">
                    <label className="form-label">Instrumento</label>
                    <select className="form-select" value={data.instrument} onChange={e => onChange('instrument', e.target.value)}>
                        <option value="">Sin especificar</option>
                        {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Rol</label>
                    <select className="form-select" value={data.role} onChange={e => onChange('role', e.target.value)}>
                        {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                </div>
            </div>
            <div className="form-group">
                <label className="form-label">Color de avatar</label>
                <div style={{ display: 'flex', gap: 8 }}>
                    {AVATAR_COLORS.map(c => (
                        <button key={c} onClick={() => onChange('avatar_color', c)}
                            style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: data.avatar_color === c ? '2px solid white' : '1px solid transparent', cursor: 'pointer', boxShadow: data.avatar_color === c ? `0 0 0 2px ${c}` : 'none' }} />
                    ))}
                </div>
            </div>
        </>
    );

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5 }}>Músicos</h1>
                    <p className="text-muted">{users.length} miembros del equipo</p>
                </div>
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={15} /> Agregar músico</button>
            </div>

            {isLoading ? <div className="loading-screen"><div className="spinner" /></div> :
                users.length === 0 ? (
                    <div className="empty-state"><UsersIcon size={48} /><h3>Sin músicos</h3><p>Agrega a los miembros del equipo</p></div>
                ) : (
                    <div className="grid grid-3">
                        {users.map(user => (
                            <div key={user.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 14, position: 'relative' }}>
                                <div className="avatar" style={{ background: user.avatar_color || 'var(--primary)', fontSize: 16 }}>
                                    {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                                    <div className="text-muted" style={{ fontSize: 12 }}>{user.instrument || 'Sin instrumento'}</div>
                                    <span className="badge badge-muted" style={{ marginTop: 6 }}>{ROLES.find(r => r.value === user.role)?.label || user.role}</span>
                                </div>
                                <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(user)}><Edit2 size={13} /></button>
                                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(user)}><Trash2 size={13} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Agregar músico" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.name.trim()}>Agregar</button>
                </>}>
                <FormContent data={form} onChange={set} />
            </Modal>

            <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar músico" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => updateMut.mutate({ id: editing.id, data: editing })}>Guardar</button>
                </>}>
                {editing && <FormContent data={editing} onChange={(k, v) => setEditing(e => ({ ...e, [k]: v }))} />}
            </Modal>

            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar músico" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={() => deleteMut.mutate(deleteTarget.id)}>Eliminar</button>
                </>}>
                <p className="text-muted">¿Eliminar a <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.name}</strong>?</p>
            </Modal>
        </div>
    );
}
