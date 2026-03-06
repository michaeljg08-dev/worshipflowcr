import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const controllerDir = join(rootDir, 'controller');
const mobileDir = join(rootDir, 'mobile');
const serverPublicDir = join(__dirname, 'public');
const serverMobileDir = join(__dirname, 'public-mobile');

console.log('1. Building Controller (React)...');
execSync('npm run build', { cwd: controllerDir, stdio: 'inherit' });

console.log('1.5. Building Mobile (React)...');
execSync('npm run build', { cwd: mobileDir, stdio: 'inherit' });

console.log('2. Preparing public directories...');
if (existsSync(serverPublicDir)) {
    rmSync(serverPublicDir, { recursive: true, force: true });
}
if (existsSync(serverMobileDir)) {
    rmSync(serverMobileDir, { recursive: true, force: true });
}

console.log('3. Copying dists to public destinations...');
cpSync(join(controllerDir, 'dist'), serverPublicDir, { recursive: true });
cpSync(join(mobileDir, 'dist'), serverMobileDir, { recursive: true });

console.log('4. Packaging executable with Electron Packager...');
execSync('npx electron-packager . WorshipFlow --platform=win32 --arch=x64 --out=dist-electron --overwrite --extra-resource=.env', { cwd: __dirname, stdio: 'inherit' });

console.log('✅ Build complete! Executable is in server/dist-electron/');
