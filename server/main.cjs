const { app, BrowserWindow, screen } = require('electron');
const path = require('path');
const { fork } = require('child_process');
const http = require('http');
const fs = require('fs');

let mainWindow;
let serverProcess;

function createWindow() {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    mainWindow = new BrowserWindow({
        width: Math.min(1280, width),
        height: Math.min(720, height),
        title: "WorshipFlow",
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
            // Allow the window API for fullscreen multi-monitor placement!
        }
    });

    // We can also grant permissions silently
    mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        if (permission === 'window-management' || permission === 'fullscreen') {
            callback(true);
            return;
        }
        callback(false);
    });

    mainWindow.loadURL('http://localhost:3000');

    // Maximizar u ocupar pantalla principal
    mainWindow.maximize();
}

app.whenReady().then(() => {
    // 0. Manual .env injection for packaged apps
    const customEnv = {};
    try {
        const isPackaged = app.isPackaged;
        const envPath = isPackaged
            ? path.join(process.resourcesPath, '.env')
            : path.join(__dirname, '.env');

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf-8');
            envContent.split('\n').forEach(line => {
                const parts = line.split('=');
                if (parts.length >= 2) {
                    customEnv[parts[0].trim()] = parts.slice(1).join('=').trim();
                }
            });
            console.log("Main process loaded .env manually.");
        }
    } catch (e) { console.error("Could not parse .env manually", e) }

    // 1. Iniciar la base de datos y backend
    const serverPath = path.join(__dirname, 'src', 'index.js');
    serverProcess = fork(serverPath, [], {
        env: { ...process.env, ...customEnv, PORT: 3000 }
    });

    const checkServer = (url, timeout, cb) => {
        const start = Date.now();
        const interval = setInterval(() => {
            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    clearInterval(interval);
                    cb(null);
                }
            }).on('error', () => {
                if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    cb(new Error('Timeout'));
                }
            });
        }, 500);
    };

    // 2. Esperar a que el puerto 3000 responda antes de lanzar la ventana UI
    checkServer('http://localhost:3000/api/status', 15000, (err) => {
        if (err) console.error('El backend no respondió a tiempo:', err);
        createWindow();
    });
});

app.on('will-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
