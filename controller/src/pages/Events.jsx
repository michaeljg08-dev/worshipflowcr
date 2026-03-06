import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Calendar, ChevronLeft, ChevronRight, Edit2, Trash2, Clock, Music2 } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { api } from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { EVENT_TYPES } from '../constants';

const TYPE_LABELS = { service: 'Servicio', rehearsal: 'Ensayo', special: 'Especial', other: 'Otro' };
const TYPE_CLASS = { service: 'service', rehearsal: 'rehearsal', special: 'special', other: '' };

export default function Events() {
    const qc = useQueryClient();
    const toast = useToast();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: calStart, end: calEnd });

    const { data: events = [] } = useQuery({
        queryKey: ['events', format(monthStart, 'yyyy-MM'), format(monthEnd, 'yyyy-MM-dd')],
        queryFn: () => api.events.list({ from: format(calStart, 'yyyy-MM-dd'), to: format(calEnd, 'yyyy-MM-dd') }),
    });
    const { data: playlists = [] } = useQuery({ queryKey: ['playlists'], queryFn: api.playlists.list });

    const getEventsForDay = (day) => events.filter(e => isSameDay(parseISO(e.date), day));
    const dayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

    const emptyForm = () => ({
        title: '', date: selectedDay ? format(selectedDay, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        time: '', end_time: '', playlist_id: '', event_type: 'service', notes: '',
    });

    const [form, setForm] = useState(emptyForm);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const createMut = useMutation({
        mutationFn: (d) => api.events.create(d),
        onSuccess: () => { qc.invalidateQueries(['events']); setModalOpen(false); toast.success('Evento creado'); },
        onError: e => toast.error(e.message),
    });

    const updateMut = useMutation({
        mutationFn: ({ id, data }) => api.events.update(id, data),
        onSuccess: () => { qc.invalidateQueries(['events']); setEditing(null); toast.success('Evento actualizado'); },
        onError: e => toast.error(e.message),
    });

    const deleteMut = useMutation({
        mutationFn: (id) => api.events.delete(id),
        onSuccess: () => { qc.invalidateQueries(['events']); setDeleteTarget(null); toast.success('Evento eliminado'); },
        onError: e => toast.error(e.message),
    });

    const openCreate = () => {
        setForm(emptyForm());
        setModalOpen(true);
    };

    return (
        <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 60px - 48px)' }}>
            {/* Calendar */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Month Nav */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><ChevronLeft size={18} /></button>
                        <h2 style={{ fontSize: 18, fontWeight: 700, minWidth: 180, textAlign: 'center' }}>
                            {format(currentDate, 'MMMM yyyy', { locale: es }).replace(/^\w/, c => c.toUpperCase())}
                        </h2>
                        <button className="btn btn-ghost btn-icon" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><ChevronRight size={18} /></button>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setCurrentDate(new Date()); setSelectedDay(new Date()); }}>Hoy</button>
                        <button className="btn btn-primary btn-sm" onClick={openCreate}><Plus size={14} /> Nuevo evento</button>
                    </div>
                </div>

                {/* Day headers */}
                <div className="calendar-grid">
                    {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                        <div key={d} className="cal-day-header">{d}</div>
                    ))}
                </div>

                {/* Days */}
                <div className="calendar-grid" style={{ flex: 1, overflowY: 'auto' }}>
                    {days.map(day => {
                        const evts = getEventsForDay(day);
                        const isSelected = selectedDay && isSameDay(day, selectedDay);
                        return (
                            <div
                                key={day.toISOString()}
                                className={`cal-day${isToday(day) ? ' today' : ''}${!isSameMonth(day, currentDate) ? ' other-month' : ''}${isSelected ? ' active' : ''}`}
                                style={isSelected ? { border: '1px solid var(--primary)', background: 'var(--primary-light)' } : {}}
                                onClick={() => setSelectedDay(day)}
                            >
                                <span className="cal-day-num">{format(day, 'd')}</span>
                                <div className="cal-events">
                                    {evts.slice(0, 3).map(e => (
                                        <div key={e.id} className={`cal-event-dot ${TYPE_CLASS[e.event_type]}`}>
                                            {e.time && <span>{e.time.slice(0, 5)} </span>}{e.title}
                                        </div>
                                    ))}
                                    {evts.length > 3 && <div className="cal-event-dot">+{evts.length - 3} más</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Selected Day events */}
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>
                <div>
                    <h3 style={{ fontWeight: 700, fontSize: 15 }}>
                        {selectedDay ? format(selectedDay, "d 'de' MMMM", { locale: es }) : 'Selecciona un día'}
                    </h3>
                    <p className="text-muted" style={{ fontSize: 12 }}>{dayEvents.length} evento{dayEvents.length !== 1 ? 's' : ''}</p>
                </div>

                {selectedDay && (
                    <button className="btn btn-secondary btn-sm" onClick={openCreate}><Plus size={13} /> Agregar en este día</button>
                )}

                {selectedDay && dayEvents.length === 0 ? (
                    <div className="empty-state" style={{ padding: '30px 10px' }}>
                        <Calendar size={28} />
                        <p>Sin eventos este día</p>
                    </div>
                ) : (
                    dayEvents.map(ev => (
                        <div key={ev.id} className="card" style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 14 }}>{ev.title}</div>
                                    <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                                        <span className={`badge badge-${ev.event_type === 'service' ? 'primary' : ev.event_type === 'rehearsal' ? 'success' : 'warning'}`}>
                                            {TYPE_LABELS[ev.event_type]}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditing(ev)}><Edit2 size={12} /></button>
                                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteTarget(ev)}><Trash2 size={12} /></button>
                                </div>
                            </div>
                            {ev.time && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
                                <Clock size={11} /> {ev.time}{ev.end_time ? ` - ${ev.end_time}` : ''}
                            </div>}
                            {ev.playlist_name && <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                <Music2 size={11} /> {ev.playlist_name}
                            </div>}
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuevo Evento"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => createMut.mutate(form)} disabled={!form.title || !form.date}>Crear</button>
                </>}>
                <div className="form-group"><label className="form-label">Título *</label>
                    <input className="form-input" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: Servicio Dominical" autoFocus /></div>
                <div className="form-row form-row-2">
                    <div className="form-group"><label className="form-label">Tipo</label>
                        <select className="form-select" value={form.event_type} onChange={e => set('event_type', e.target.value)}>
                            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select></div>
                    <div className="form-group"><label className="form-label">Fecha *</label>
                        <input className="form-input" type="date" value={form.date} onChange={e => set('date', e.target.value)} /></div>
                </div>
                <div className="form-row form-row-2">
                    <div className="form-group"><label className="form-label">Hora inicio</label>
                        <input className="form-input" type="time" value={form.time} onChange={e => set('time', e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Hora fin</label>
                        <input className="form-input" type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} /></div>
                </div>
                <div className="form-group"><label className="form-label">Playlist</label>
                    <select className="form-select" value={form.playlist_id} onChange={e => set('playlist_id', e.target.value)}>
                        <option value="">Sin playlist</option>
                        {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select></div>
                <div className="form-group"><label className="form-label">Notas</label>
                    <textarea className="form-textarea" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notas..." /></div>
            </Modal>

            {/* Edit Modal */}
            <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar Evento"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                    <button className="btn btn-primary" onClick={() => updateMut.mutate({ id: editing.id, data: editing })}>Guardar</button>
                </>}>
                {editing && <>
                    <div className="form-group"><label className="form-label">Título *</label>
                        <input className="form-input" value={editing.title} onChange={e => setEditing(v => ({ ...v, title: e.target.value }))} autoFocus /></div>
                    <div className="form-row form-row-2">
                        <div className="form-group"><label className="form-label">Tipo</label>
                            <select className="form-select" value={editing.event_type} onChange={e => setEditing(v => ({ ...v, event_type: e.target.value }))}>
                                {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select></div>
                        <div className="form-group"><label className="form-label">Fecha *</label>
                            <input className="form-input" type="date" value={editing.date} onChange={e => setEditing(v => ({ ...v, date: e.target.value }))} /></div>
                    </div>
                    <div className="form-row form-row-2">
                        <div className="form-group"><label className="form-label">Hora inicio</label>
                            <input className="form-input" type="time" value={editing.time || ''} onChange={e => setEditing(v => ({ ...v, time: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Hora fin</label>
                            <input className="form-input" type="time" value={editing.end_time || ''} onChange={e => setEditing(v => ({ ...v, end_time: e.target.value }))} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Playlist</label>
                        <select className="form-select" value={editing.playlist_id || ''} onChange={e => setEditing(v => ({ ...v, playlist_id: e.target.value }))}>
                            <option value="">Sin playlist</option>
                            {playlists.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select></div>
                </>}
            </Modal>

            {/* Delete Modal */}
            <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Eliminar evento" size="modal-sm"
                footer={<>
                    <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancelar</button>
                    <button className="btn btn-danger" onClick={() => deleteMut.mutate(deleteTarget.id)}>Eliminar</button>
                </>}>
                <p className="text-muted">¿Eliminar <strong style={{ color: 'var(--text-primary)' }}>{deleteTarget?.title}</strong>?</p>
            </Modal>
        </div>
    );
}
