// scripts/manage-chrome.js
// Utility to manage a local Chrome/Chromium instance with remote debugging for UI verification.
// Exposes startChrome(), getDebugEndpoint(), isChromeRunning(), stopChrome().
// Uses CommonJS module style to match existing scripts.

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const http = require('http');

// Session file to persist pid, port, and user-data directory across runs.
const SESSION_FILE = path.join(os.tmpdir(), 'manage-chrome-session.json');

/** Find Chrome executable on Windows. */
function findChromeExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Chromium\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome executable not found. Install Chrome or adjust paths in findChromeExecutable().');
}

/** Get a free TCP port. */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/** Check if a PID is still alive. */
function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

/** Probe the remote‑debugging endpoint to confirm Chrome is listening. */
function probeDebugPort(port) {
  return new Promise((resolve) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: '/json/version', timeout: 2000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const info = JSON.parse(data);
          resolve(Boolean(info.webSocketDebuggerUrl));
        } catch (_) {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Load previously saved session information, if any. */
function loadSession() {
  if (fs.existsSync(SESSION_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    } catch (_) {
      return null;
    }
  }
  return null;
}

/** Persist session information for later reuse. */
function saveSession(info) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(info, null, 2), 'utf8');
}

/** Remove the session file. */
function clearSession() {
  if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
}

/** Public API: start (or reuse) Chrome with remote debugging. */
async function startChrome() {
  const existing = loadSession();
  if (existing && isPidAlive(existing.pid)) {
    const alive = await probeDebugPort(existing.port);
    if (alive) {
      console.log(`[manage-chrome] Reusing existing Chrome (pid ${existing.pid}) on port ${existing.port}`);
      return;
    }
    console.log('[manage-chrome] Stale session detected – cleaning up.');
    await stopChrome();
  }

  const chromePath = findChromeExecutable();
  const port = await getFreePort();
  const userDataDir = path.join(os.tmpdir(), `chrome-profile-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const args = [
    '--headless=new',
    '--disable-gpu',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--no-first-run',
    '--no-default-browser-check',
  ];

  console.log(`[manage-chrome] Launching Chrome (${chromePath}) on port ${port}`);
  const chrome = spawn(chromePath, args, { detached: true, stdio: 'ignore' });
  chrome.unref();

  // Wait for the debugging endpoint to become available.
  const maxAttempts = 12;
  for (let i = 0; i < maxAttempts; i++) {
    // eslint-disable-next-line no-await-in-loop
    if (await probeDebugPort(port)) {
      saveSession({ pid: chrome.pid, port, userDataDir });
      console.log(`[manage-chrome] Chrome started (pid ${chrome.pid}) – debugging URL http://127.0.0.1:${port}`);
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Chrome failed to expose remote‑debugging within the expected time.');
}

/** Return the HTTP debugging endpoint for the current session. */
function getDebugEndpoint() {
  const sess = loadSession();
  if (!sess) throw new Error('No Chrome session found – call startChrome() first.');
  return `http://127.0.0.1:${sess.port}`;
}

/** Check whether Chrome is currently running and reachable. */
async function isChromeRunning() {
  const sess = loadSession();
  if (!sess) return false;
  if (!isPidAlive(sess.pid)) return false;
  return await probeDebugPort(sess.port);
}

/** Gracefully stop the Chrome process started by this utility. */
async function stopChrome() {
  const sess = loadSession();
  if (!sess) {
    console.log('[manage-chrome] No active Chrome session to stop.');
    return;
  }
  try {
    process.kill(sess.pid);
    console.log(`[manage-chrome] Terminated Chrome (pid ${sess.pid}).`);
  } catch (e) {
    console.warn('[manage-chrome] Failed to kill Chrome process:', e.message);
  }
  try {
    fs.rmSync(sess.userDataDir, { recursive: true, force: true });
    console.log('[manage-chrome] Removed temporary user-data directory.');
  } catch (e) {
    console.warn('[manage-chrome] Could not remove temp profile:', e.message);
  }
  clearSession();
}

module.exports = { startChrome, getDebugEndpoint, isChromeRunning, stopChrome };
