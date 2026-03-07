import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Book, Search, Smartphone, List, Grid3X3, Layers,
    ChevronRight, BookOpen, Send, Trash2, Import, Plus
} from 'lucide-react';
import { api, wsSend } from '../api';
import { useToast } from '../components/Toast';

const BOOK_COLORS = {
    'Pentateuco': '#6366f1',
    'Historia': '#f59e0b',
    'Poesía': '#8b5cf6',
    'Profetas Mayores': '#ef4444',
    'Profetas Menores': '#ec4899',
    'Evangelios': '#10b981',
    'Hechos': '#06b6d4',
    'Epístolas Paulinas': '#3b82f6',
    'Epístolas Generales': '#84cc16',
    'Apocalipsis': '#64748b'
};

const TESTAMENT_GROUPS = {
    'OT': [
        { name: 'Pentateuco', range: [1, 5] },
        { name: 'Historia', range: [6, 17] },
        { name: 'Poesía', range: [18, 22] },
        { name: 'Profetas Mayores', range: [23, 27] },
        { name: 'Profetas Menores', range: [28, 39] }
    ],
    'NT': [
        { name: 'Evangelios', range: [40, 43] },
        { name: 'Hechos', range: [44, 44] },
        { name: 'Epístolas Paulinas', range: [45, 57] },
        { name: 'Epístolas Generales', range: [58, 65] },
        { name: 'Apocalipsis', range: [66, 66] }
    ]
};

function getBookCategory(num) {
    for (const test of ['OT', 'NT']) {
        for (const group of TESTAMENT_GROUPS[test]) {
            if (num >= group.range[0] && num <= group.range[1]) return group.name;
        }
    }
    return 'Otros';
}

export default function Bibles() {
    const toast = useToast();
    const [selectedBible, setSelectedBible] = useState(null);
    const [selectedBook, setSelectedBook] = useState(null);
    const [selectedChapter, setSelectedChapter] = useState(1);
    const [selectedVerse, setSelectedVerse] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: bibles = [] } = useQuery({ queryKey: ['bibles'], queryFn: api.bibles.list });

    useEffect(() => {
        if (bibles.length > 0 && !selectedBible) {
            setSelectedBible(bibles[0]);
        }
    }, [bibles]);

    const { data: books = [] } = useQuery({
        queryKey: ['bible-books', selectedBible?.id],
        queryFn: () => api.bibles.getBooks(selectedBible.id),
        enabled: !!selectedBible
    });

    const { data: verses = [] } = useQuery({
        queryKey: ['bible-verses', selectedBible?.id, selectedBook?.id, selectedChapter],
        queryFn: () => api.bibles.getVerses(selectedBible.id, selectedBook.id, selectedChapter),
        enabled: !!selectedBible && !!selectedBook && !!selectedChapter
    });

    const filteredBooks = useMemo(() => {
        return books.filter(b =>
            b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [books, searchTerm]);

    const handleProject = (verse) => {
        if (!verse) return;
        wsSend('projection:slide', {
            type: 'bible',
            label: `${selectedBook.name} ${selectedChapter}:${verse.verse}`,
            content: verse.text,
            config: {
                title: `${selectedBook.name} ${selectedChapter}:${verse.verse}`,
                source: selectedBible.name
            }
        });
        setSelectedVerse(verse.verse);
        toast.info(`Proyectando ${selectedBook.name} ${selectedChapter}:${verse.verse}`);
    };

    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, "text/xml");

            // Intentar detectar estructura (Soporta formatos comunes tipo <bible><b n="Gen"><c n="1"><v n="1">...</v></c></b></bible>)
            const bibleNode = xmlDoc.getElementsByTagName('bible')[0] || xmlDoc.documentElement;
            const bibleName = bibleNode.getAttribute('name') || file.name.replace('.xml', '');

            const booksNodes = xmlDoc.getElementsByTagName('b') || xmlDoc.getElementsByTagName('book');
            const parsedBooks = [];

            for (let i = 0; i < booksNodes.length; i++) {
                const bNode = booksNodes[i];
                const bookName = bNode.getAttribute('n') || bNode.getAttribute('name');
                const chaptersNodes = bNode.getElementsByTagName('c') || bNode.getElementsByTagName('chapter');
                const chapters = [];

                for (let j = 0; j < chaptersNodes.length; j++) {
                    const cNode = chaptersNodes[j];
                    const cNumber = parseInt(cNode.getAttribute('n') || cNode.getAttribute('number'));
                    const versesNodes = cNode.getElementsByTagName('v') || cNode.getElementsByTagName('verse');
                    const verses = [];

                    for (let k = 0; k < versesNodes.length; k++) {
                        const vNode = versesNodes[k];
                        verses.push({
                            number: parseInt(vNode.getAttribute('n') || vNode.getAttribute('number')),
                            text: vNode.textContent.trim()
                        });
                    }
                    chapters.push({ number: cNumber, verses });
                }

                parsedBooks.push({
                    name: bookName,
                    abbreviation: bookName.substring(0, 3).toUpperCase(),
                    number: i + 1,
                    chapters
                });
            }

            if (parsedBooks.length === 0) throw new Error('No se encontraron libros en el XML');

            await api.bibles.import({
                name: bibleName,
                abbreviation: bibleName.substring(0, 5).toUpperCase(),
                language: 'es',
                books: parsedBooks
            });

            toast.success('Biblia XML importada correctamente');
            window.location.reload();
        } catch (err) {
            console.error(err);
            toast.error('Error al importar XML: ' + err.message);
        }
    };

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden', background: 'var(--bg-base)' }}>

            {/* ── Verse List (Left) ──────────────────── */}
            <div style={{
                width: 320, borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)'
            }}>
                <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 style={{ fontSize: 16, fontWeight: 800 }}>{selectedBook ? `${selectedBook.name} ${selectedChapter}` : 'Seleccione libro'}</h2>
                        <div className="badge badge-primary">{verses.length} vers.</div>
                    </div>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
                    {verses.map(v => (
                        <div
                            key={v.id}
                            onClick={() => handleProject(v)}
                            style={{
                                padding: '12px 14px', borderRadius: 12, cursor: 'pointer', marginBottom: 8,
                                background: selectedVerse === v.verse ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${selectedVerse === v.verse ? 'var(--primary)' : 'transparent'}`,
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', gap: 10 }}>
                                <span style={{ color: 'var(--primary)', fontWeight: 800, fontSize: 13 }}>{v.verse}</span>
                                <span style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-primary)' }}>{v.text}</span>
                            </div>
                        </div>
                    ))}
                    {verses.length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: 40, color: 'var(--text-muted)' }}>
                            <BookOpen size={32} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p style={{ fontSize: 13 }}>Seleccione un capítulo</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Selectors (Right) ───────────────────── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <header style={{
                    padding: '12px 20px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: 'var(--bg-surface)'
                }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <select
                            className="form-select"
                            style={{ width: 220, fontSize: 14 }}
                            value={selectedBible?.id || ''}
                            onChange={(e) => setSelectedBible(bibles.find(b => b.id === e.target.value))}
                        >
                            {bibles.map(b => <option key={b.id} value={b.id}>{b.name} ({b.abbreviation})</option>)}
                        </select>
                        <div style={{ position: 'relative' }}>
                            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            <input
                                className="form-input"
                                placeholder="Buscar libro..."
                                style={{ paddingLeft: 32, width: 200, height: 36, fontSize: 13 }}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                            <Import size={14} /> Importar XML
                            <input type="file" accept=".xml" style={{ display: 'none' }} onChange={handleImport} />
                        </label>
                    </div>
                </header>

                <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

                    {/* Books Grid */}
                    <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Libros</h3>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
                        gap: 6,
                        marginBottom: 32
                    }}>
                        {filteredBooks.map(b => {
                            const color = BOOK_COLORS[getBookCategory(b.book_number)];
                            const isActive = selectedBook?.id === b.id;
                            return (
                                <div
                                    key={b.id}
                                    onClick={() => { setSelectedBook(b); setSelectedChapter(1); setSelectedVerse(null); }}
                                    style={{
                                        background: isActive ? color : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${isActive ? '#fff' : 'rgba(255,255,255,0.1)'}`,
                                        borderRadius: 8, height: 70, cursor: 'pointer',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        transition: 'all 0.15s',
                                        boxShadow: isActive ? `0 0 15px ${color}88` : 'none',
                                        transform: isActive ? 'scale(1.05)' : 'none',
                                        zIndex: isActive ? 10 : 1
                                    }}
                                >
                                    <span style={{ fontSize: 16, fontWeight: 800, color: isActive ? '#fff' : color }}>{b.abbreviation}</span>
                                    <span style={{ fontSize: 9, color: isActive ? '#fff' : 'var(--text-muted)', textAlign: 'center', padding: '0 4px', whiteSpace: 'nowrap', overflow: 'hidden', width: '100%' }}>{b.name}</span>
                                </div>
                            );
                        })}
                    </div>

                    {selectedBook && (
                        <>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Capítulos: {selectedBook.name}</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                                gap: 6,
                                marginBottom: 32
                            }}>
                                {Array.from({ length: selectedBook.chapters_count }, (_, i) => i + 1).map(c => (
                                    <div
                                        key={c}
                                        onClick={() => { setSelectedChapter(c); setSelectedVerse(null); }}
                                        style={{
                                            background: selectedChapter === c ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                            borderRadius: 8, height: 50, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 18, fontWeight: 700, color: selectedChapter === c ? '#fff' : 'var(--text-primary)',
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        {c}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {selectedBook && selectedChapter && (
                        <>
                            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Versículos</h3>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(50px, 1fr))',
                                gap: 6
                            }}>
                                {verses.map(v => (
                                    <div
                                        key={v.id}
                                        onClick={() => handleProject(v)}
                                        style={{
                                            background: selectedVerse === v.verse ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
                                            borderRadius: 8, height: 50, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 18, fontWeight: 700, color: selectedVerse === v.verse ? '#fff' : 'var(--text-primary)',
                                            transition: 'all 0.1s'
                                        }}
                                    >
                                        {v.verse}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
}
