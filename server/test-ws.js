import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws?type=mobile');

ws.on('open', () => {
    console.log('Connected to WS');
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.type === 'live:state') {
        console.log('\n--- LIVE STATE UPDATE ---');
        console.log(JSON.stringify(msg.data, null, 2));
    }
});
