import puppeteer from 'puppeteer';
import { WebSocket } from 'ws';

(async () => {
    console.log('Iniciando prueba interactiva de pre-selección y bloqueo bíblico...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 }); // iPhone 12 size

    const wsParams = `?type=mobile&id=test-client`;
    const ws = new WebSocket(`ws://localhost:3000/ws${wsParams}`);

    ws.on('open', async () => {
        console.log('🔌 Conectado a WebSocket inyectando datos...');

        // Simular que el Controlador pre-seleccionó la playlist, pero NO hay show en vivo.
        // Se carga la página del móvil...
        await page.goto('http://localhost:5175/live', { waitUntil: 'networkidle0' });

        // Hacemos que de click en vincular modo local
        try {
            await page.waitForFunction(() => {
                const btn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('VINCULAR'));
                if (btn) { btn.click(); return true; }
                return false;
            }, { timeout: 2000 });
        } catch (e) {
            console.log('Botón VINCULAR no encontrado (tal vez ya local)');
        }

        // 1. Enviar el evento preselect de una playlist falsa generada
        const mockPlaylist = {
            id: 'playlist-1',
            songs: [
                { song_id: 's1', title: 'Primera Cancion' },
                { song_id: 's2', title: 'Segunda Cancion' }
            ]
        };

        // Inyectamos el mock al backend via eval de puppeteer para que lo coja (o usamos el ws si fuese real,
        // pero useSyncData va hasta Supabase. En este entorno, mockearemos Supabase/cache local)
        await page.evaluate((pl) => {
            window.localStorage.setItem('sync_playlists', JSON.stringify({ [pl.id]: pl }));
        }, mockPlaylist);

        ws.send(JSON.stringify({
            type: 'live:preselect',
            data: { playlistId: 'playlist-1' }
        }));

        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\8a4bfcd4-0f99-47fb-be0c-b4958d473091\\mobile_preselect_only.png' });
        console.log('📸 Captura guardada: Preselección (solo playlist listada)');

        // 2. Simular que el controlador inicia una Biblia (NO debería mostrarse en el móvil, debe retener la playlist)
        ws.send(JSON.stringify({
            type: 'projection:slide',
            data: { type: 'bible', config: { title: 'Génesis 1:1 - No debería verse' }, content: 'Test bible content' }
        }));

        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\8a4bfcd4-0f99-47fb-be0c-b4958d473091\\mobile_bible_ignored.png' });
        console.log('📸 Captura guardada: Biblia ignorada (aún viendo setlist)');

        // 3. Simular iniciar la canción (Debería entrar a Live form natural)
        ws.send(JSON.stringify({
            type: 'live:song',
            data: { songIdx: 1, songDetails: { song_id: 's2', title: 'Segunda Cancion', chordpro: '[V1]\nHola' } }
        }));
        ws.send(JSON.stringify({
            type: 'live:position',
            data: { label: 'V1' }
        }));

        await new Promise(r => setTimeout(r, 1000));
        await page.screenshot({ path: 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\8a4bfcd4-0f99-47fb-be0c-b4958d473091\\mobile_song_live.png' });
        console.log('📸 Captura guardada: Canción Activa Mapeada');

        await browser.close();
        ws.close();
        process.exit(0);
    });

})();
