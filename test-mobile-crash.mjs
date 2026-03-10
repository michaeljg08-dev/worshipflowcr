import puppeteer from 'puppeteer';

(async () => {
    console.log('Starting puppeteer to capture crash...');
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();

    // Capturar logs de consola
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message, err.stack));

    // Primero abrimos projection (no importa si no arranca live aquí, queremos ver si mobile crashea de base)
    await page.goto('http://localhost:5175/live', { waitUntil: 'networkidle2' });

    console.log('Página cargada, inyectando un estado live artificial vía socket simulado...');

    // Podemos ver si hay crash inmediatamente. Si no, inyectamos window variables:
    await page.evaluate(() => {
        // Si queremos simular algo
    });

    await new Promise(r => setTimeout(r, 2000));
    await browser.close();
    console.log('Puppeteer test finished.');
})();
