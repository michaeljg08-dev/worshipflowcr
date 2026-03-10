import puppeteer from 'puppeteer';
import { WebSocket } from 'ws';

(async () => {
    console.log('Iniciando prueba de scroll continuo...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 }); // iPhone 12 size

    const wsParams = `?type=mobile&id=test-client-continuous`;
    const ws = new WebSocket(`ws://localhost:3000/ws${wsParams}`);

    ws.on('open', async () => {
        console.log('🔌 Conectado a WebSocket...');

        await page.goto('http://localhost:5175/live', { waitUntil: 'networkidle0' });

        // Mocking Supabase/cache via localStorage
        const mockPlaylist = {
            id: 'playlist-continuous',
            songs: [
                { song_id: 's1', title: 'Cancion 1', chordpro: '[V1]\nParte de la cancion 1' },
                { song_id: 's2', title: 'Cancion 2', chordpro: '[V1]\nParte de la cancion 2' },
                { song_id: 's3', title: 'Cancion 3', chordpro: '[V1]\nParte de la cancion 3' }
            ]
        };

        await page.evaluate((pl) => {
            window.localStorage.setItem('sync_playlists', JSON.stringify({ [pl.id]: pl }));
            // Add songs to sync cache
            const songsCache = {};
            pl.songs.forEach(s => { songsCache[s.song_id] = s; });
            window.localStorage.setItem('sync_songs', JSON.stringify(songsCache));
        }, mockPlaylist);

        // 1. Preselect playlist
        ws.send(JSON.stringify({
            type: 'live:preselect',
            data: { playlistId: 'playlist-continuous' }
        }));
        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity/brain/8a4bfcd4-0f99-47fb-be0c-b4958d473091/mobile_continuous_preselect.png' });
        console.log('📸 Captura: Preselección');

        // 2. Start Live with Song 2
        ws.send(JSON.stringify({
            type: 'live:song',
            data: {
                playlistId: 'playlist-continuous',
                songIdx: 1,
                songDetails: mockPlaylist.songs[1],
                isActive: true,
                item: { type: 'song', data: mockPlaylist.songs[1] }
            }
        }));
        // El servidor real envía un estado completo, aquí emulamos el cambio de canción activa
        ws.send(JSON.stringify({
            type: 'live:state',
            data: {
                isActive: true,
                playlistId: 'playlist-continuous',
                songIdx: 1,
                item: { type: 'song', data: mockPlaylist.songs[1] }
            }
        }));

        await new Promise(r => setTimeout(r, 1500));

        // Hacer scroll manual hacia arriba para ver si sigue la Cancion 1
        await page.evaluate(() => {
            window.scrollTo(0, 0);
        });
        await new Promise(r => setTimeout(r, 500));
        await page.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity/brain/8a4bfcd4-0f99-47fb-be0c-b4958d473091/mobile_continuous_scroll_up.png' });
        console.log('📸 Captura: Scroll Arriba (debe verse Cancion 1)');

        // 3. Move to Song 3
        ws.send(JSON.stringify({
            type: 'live:state',
            data: {
                isActive: true,
                playlistId: 'playlist-continuous',
                songIdx: 2,
                item: { type: 'song', data: mockPlaylist.songs[2] }
            }
        }));
        ws.send(JSON.stringify({
            type: 'live:position',
            data: { label: 'V1' }
        }));

        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'C:/Users/Usuario/.gemini/antigravity/brain/8a4bfcd4-0f99-47fb-be0c-b4958d473091/mobile_continuous_auto_scroll.png' });
        console.log('📸 Captura: Auto-scroll a Cancion 3');

        await browser.close();
        ws.close();
        process.exit(0);
    });

})();
