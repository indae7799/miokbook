const path = require('path');
const fs = require('fs');
const { spawn, spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'apps', 'web');
const nextDir = path.join(appDir, 'node_modules', 'next');
const reactQueryDir = path.join(appDir, 'node_modules', '@tanstack', 'react-query');

function ensureDeps() {
  if (fs.existsSync(nextDir) && fs.existsSync(reactQueryDir)) return;
  console.log('Installing web app dependencies...');
  const r = spawnSync('npm', ['install'], { cwd: appDir, stdio: 'inherit', shell: true });
  if (r.status !== 0) process.exit(r.status || 1);
}

ensureDeps();

const child = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  cwd: appDir,
  env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' },
  shell: true,
});

child.on('exit', (code) => process.exit(code != null ? code : 0));
