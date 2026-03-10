import puppeteer from 'puppeteer';
import { WebSocket } from 'ws';

(async () => {
    console.log('Starting visual verification test...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Config browser for mobile
    await page.setViewport({ width: 390, height: 844 });

    // Go to Live page
    await page.goto('http://localhost:5175/live', { waitUntil: 'networkidle0' });

    console.log('Connecting WS controller...');
    const ws = new WebSocket('ws://localhost:3000/ws?type=controller&id=puppeteer_test');

    ws.on('open', async () => {
        console.log('WS connected. Triggering Plaintext Song...');

        ws.send(JSON.stringify({
            type: 'live:start',
            data: {
                playlistId: 'test1',
                songIdx: 0,
                songDetails: {
                    song_id: 'test-plain',
                    title: 'Canción en Texto Plano',
                    author: '',
                    lyrics: 'Verso 1\nEsta canción no tiene formato ChordPro.\nSimplemente renderiza la propiedad lyrics.\n\n\nCoro\nEl texto plano funciona bien.\nY está bien formateado en pantalla.',
                    chordpro: '',
                    bpm: 120,
                    time_signature: '4/4',
                    custom_key: 'G'
                }
            }
        }));

        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\8a4bfcd4-0f99-47fb-be0c-b4958d473091\\mobile_plaintext.png' });
        console.log('Saved mobile_plaintext.png');

        console.log('Triggering Bible verse...');
        ws.send(JSON.stringify({
            type: 'projection:slide',
            data: {
                type: 'bible',
                label: 'Juan 3:16',
                content: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.',
                config: {
                    title: 'Juan 3:16',
                    source: 'RVR1960'
                }
            }
        }));

        await new Promise(r => setTimeout(r, 2000));
        await page.screenshot({ path: 'C:\\Users\\Usuario\\.gemini\\antigravity\\brain\\8a4bfcd4-0f99-47fb-be0c-b4958d473091\\mobile_bible.png' });
        console.log('Saved mobile_bible.png');

        ws.close();
        await browser.close();
        console.log('Done!');
    });
})();
