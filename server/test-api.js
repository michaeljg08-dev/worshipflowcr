// Quick API test script
const BASE = 'http://localhost:3000/api';

async function test() {
    console.log('=== WorshipFlow API Tests ===\n');

    // 1. Status
    let r = await fetch(`${BASE}/status`);
    let d = await r.json();
    console.log('✅ Status:', d.status, '| Uptime:', Math.round(d.uptime) + 's');

    // 2. Create a song
    r = await fetch(`${BASE}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Grande es tu Fidelidad',
            author: 'Thomas Chisholm',
            song_key: 'D',
            bpm: 72,
            category: 'Himno',
            sections: [
                { type: 'verse', label: 'Verso 1', content: 'Oh Dios eterno, tu misericordia\nNi una sombra de duda tendrá', chords: ['D', 'G', 'A', 'D'] },
                { type: 'chorus', label: 'Coro', content: 'Grande es tu fidelidad\nGrande es tu fidelidad', chords: ['G', 'D', 'A', 'D'] }
            ]
        })
    });
    const song = await r.json();
    console.log('✅ Song created:', song.title, '| ID:', song.id);

    // 3. Get song with sections
    r = await fetch(`${BASE}/songs/${song.id}`);
    d = await r.json();
    console.log('✅ Song detail:', d.title, '| Sections:', d.sections?.length);

    // 4. List songs
    r = await fetch(`${BASE}/songs`);
    d = await r.json();
    console.log('✅ Songs list:', d.length, 'songs');

    // 5. Create a playlist
    r = await fetch(`${BASE}/playlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Domingo 2 Marzo', description: 'Servicio dominical' })
    });
    const playlist = await r.json();
    console.log('✅ Playlist created:', playlist.name, '| ID:', playlist.id);

    // 6. Add song to playlist
    r = await fetch(`${BASE}/playlists/${playlist.id}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ song_id: song.id })
    });
    d = await r.json();
    console.log('✅ Song added to playlist');

    // 7. Get playlist with songs
    r = await fetch(`${BASE}/playlists/${playlist.id}`);
    d = await r.json();
    console.log('✅ Playlist detail:', d.name, '| Songs:', d.songs?.length);

    // 8. Create an event
    r = await fetch(`${BASE}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: 'Servicio Dominical',
            date: '2026-03-08',
            time: '10:00',
            end_time: '12:00',
            playlist_id: playlist.id,
            event_type: 'service'
        })
    });
    const event = await r.json();
    console.log('✅ Event created:', event.title, '| Date:', event.date);

    // 9. List users
    r = await fetch(`${BASE}/users`);
    d = await r.json();
    console.log('✅ Users:', d.length, '| First:', d[0]?.name);

    // 10. Add attendance
    r = await fetch(`${BASE}/events/${event.id}/attend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: d[0].id, status: 'confirmed' })
    });
    console.log('✅ Attendance confirmed');

    // 11. Get settings
    r = await fetch(`${BASE}/users/settings/all`);
    d = await r.json();
    console.log('✅ Settings keys:', Object.keys(d).join(', '));

    // 12. Transpose song
    r = await fetch(`${BASE}/songs/${song.id}/transpose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semitones: 2 })
    });
    d = await r.json();
    console.log('✅ Transposed from D to:', d.newKey);

    console.log('\n=== All tests passed! ===');
}

test().catch(err => {
    console.error('❌ Test failed:', err.message);
    process.exit(1);
});
