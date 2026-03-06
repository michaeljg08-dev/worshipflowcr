import React from 'react';

const SECTION_TYPES = {
    intro: { label: 'Intro', color: '#6366f1' },
    verse: { label: 'Verso', color: '#3b82f6' },
    pre_chorus: { label: 'Pre-Coro', color: '#8b5cf6' },
    chorus: { label: 'Coro', color: '#10b981' },
    bridge: { label: 'Puente', color: '#f59e0b' },
    interlude: { label: 'Interludio', color: '#6b7280' },
    outro: { label: 'Outro', color: '#ef4444' },
    custom: { label: 'Personalizado', color: '#9090b0' },
};

const KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
    'Cm', 'C#m', 'Dm', 'D#m', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bm'];

const CATEGORIES = ['Alabanza', 'Adoración', 'Himno', 'Evangelismo', 'Comunión', 'Ofertorio', 'Navidad', 'Otro'];

const EVENT_TYPES = [
    { value: 'service', label: 'Servicio' },
    { value: 'rehearsal', label: 'Ensayo' },
    { value: 'special', label: 'Especial' },
    { value: 'other', label: 'Otro' },
];

export { SECTION_TYPES, KEYS, CATEGORIES, EVENT_TYPES };
