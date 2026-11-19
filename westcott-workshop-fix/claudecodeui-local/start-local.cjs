const { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } = require('node:fs');
const { join, dirname } = require('node:path');
const { spawn } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { applyWestcottTheme } = require('./apply-westcott-theme.cjs');
const { createPeerKey, keyPath, probePeer } = require('./workshop-peer.cjs');

const workdir = __dirname;
const port = process.env.EW_WORKSHOP_PORT || '3001';
const baseUrl = 'http://127.0.0.1:' + port;
const edgeAppUrl = 'http://localhost:' + port;
const claude = join(process.env.USERPROFILE, '.local', 'bin', 'claude.exe');
const server = join(workdir, 'node_modules', '@cloudcli-ai', 'cloudcli', 'dist-server', 'server', 'index.js');
const dataDir = process.env.EW_WORKSHOP_DATA_DIR || join(workdir, 'data');
const log = join(dataDir, 'cloudcli.log');

function hideCodexChatConsole() {
  if (process.platform !== 'win32') return;
  const sdk = join(workdir, 'node_modules', '@openai', 'codex-sdk');
  const { version } = JSON.parse(readFileSync(join(sdk, 'package.json'), 'utf8'));
  if (version !== '0.166.0') return;

  // CloudCLI sends ordinary GPT messages through this SDK's non-interactive codex exec.
  const file = join(sdk, 'dist', 'index.js');
  const source = readFileSync(file, 'utf8');
  const spawnOptions = /(const child = spawn\(this\.executablePath, commandArgs, \{)(\r?\n)([\s\S]*?)(\r?\n    \}\);)/;
  const match = source.match(spawnOptions);
  if (!match) throw new Error('Could not locate the Codex SDK chat launcher.');
  if (/^\s*windowsHide:\s*true\b/m.test(match[3])) return;
  const next = source.replace(spawnOptions, (_options, start, newline, options, end) =>
    start + newline + '      windowsHide: true,' + newline + options + end);
  writePatchedFile(file, next);
}

function writePatchedFile(file, source) {
  const temporary = file + '.westcott-' + process.pid + '.tmp';
  writeFileSync(temporary, source, { flag: 'wx' });
  renameSync(temporary, file);
}

function hideBackgroundConsoles() {
  if (process.platform !== 'win32') return;
  const cloudcli = join(workdir, 'node_modules', '@cloudcli-ai', 'cloudcli');
  const { version } = JSON.parse(readFileSync(join(cloudcli, 'package.json'), 'utf8'));
  if (version !== '1.37.9') return;
  const modules = join(cloudcli, 'dist-server', 'server', 'modules');
  const changes = [
    ['taskmaster/taskmaster.routes.js', [
      ["const child = spawn('which', ['task-master'], {\n", '                windowsHide: true,'],
      ["const versionChild = spawn('task-master', ['--version'], {\n", '                        windowsHide: true,'],
    ]],
    ['git/git.routes.js', [
      ['                shell: false,\n', '                windowsHide: true,'],
    ]],
    ['user/user.module.js', [
      ["spawn('git', args, {", ' windowsHide: true,'],
    ]],
    ['worktrees/services/worktree-git.service.js', [
      ["spawn('git', args, {", ' windowsHide: true,'],
    ]],
    ['providers/list/codex/codex-app-server.client.js', [
      ["const child = spawn(process.execPath, [launcher, 'app-server'], {\n", '        windowsHide: true,'],
    ]],
  ];
  for (const [name, patches] of changes) {
    const file = join(modules, name);
    const original = readFileSync(file, 'utf8');
    const newline = original.includes('\r\n') ? '\r\n' : '\n';
    let source = original;
    for (const [line, option] of patches) {
      const anchor = line.replace('\n', newline);
      const replacement = anchor + option + (line.endsWith('\n') ? newline : '');
      if (source.includes(replacement)) continue;
      if (!source.includes(anchor)) throw new Error('CloudCLI Windows patch target missing: ' + name);
      source = source.replace(anchor, replacement);
    }
    if (source !== original) writePatchedFile(file, source);
  }

  // The npm launcher starts another process for version checks and app-server.
  // Use the pipes to differentiate these calls from the interactive terminal.
  const codex = join(workdir, 'node_modules', '@openai', 'codex');
  const codexVersion = JSON.parse(readFileSync(join(codex, 'package.json'), 'utf8')).version;
  if (codexVersion !== '0.166.0') return;
  const launcher = join(codex, 'bin', 'codex.js');
  const original = readFileSync(launcher, 'utf8');
  const option = '  windowsHide: process.platform === "win32" && !process.stdin.isTTY && !process.stdout.isTTY,';
  if (original.includes(option)) return;
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const anchor = 'const child = spawn(binaryPath, process.argv.slice(2), {' + newline;
  if (!original.includes(anchor)) throw new Error('Codex Windows launcher patch target missing.');
  writePatchedFile(launcher, original.replace(anchor, anchor + option + newline));
}

function installPeerCheck() {
  const original = readFileSync(server, 'utf8');
  const marker = '// Westcott local service identity';
  if (original.includes(marker)) return;
  const newline = original.includes('\r\n') ? '\r\n' : '\n';
  const anchor = "app.get('/health',";
  if (!original.includes(anchor)) throw new Error('CloudCLI health endpoint not found.');
  const endpoint = [
    marker,
    "app.get('/__westcott/workshop-health', (req, res) => {",
    '    const nonce = req.query.nonce;',
    '    if (typeof nonce !== "string" || !/^[0-9a-f]{48}$/.test(nonce)) return res.sendStatus(400);',
    '    const file = process.env.EW_WORKSHOP_KEY_FILE;',
    '    if (!file) return res.sendStatus(503);',
    '    try {',
    '        const key = fs.readFileSync(file);',
    '        if (key.length !== 32) return res.sendStatus(503);',
    '        res.set("Cache-Control", "no-store").json({ status: "ok", proof: workshopHmac("sha256", key).update(nonce).digest("hex") });',
    '    } catch {',
    '        res.sendStatus(503);',
    '    }',
    '});',
    '',
  ].join(newline);
  const next = original.replace("import http from 'http';",
    "import http from 'http';" + newline + "import { createHmac as workshopHmac } from 'node:crypto';");
  if (next === original) throw new Error('CloudCLI HTTP import not found.');
  writePatchedFile(server, next.replace(anchor, endpoint + anchor));
}

async function openBrowser() {
  if (process.argv.includes('--no-browser')) return;
  if (process.argv.includes('--edge-app')) {
    const edge = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA]
      .filter(Boolean)
      .map(folder => join(folder, 'Microsoft', 'Edge', 'Application', 'msedge.exe'))
      .find(existsSync);
    if (!edge) throw new Error('Microsoft Edge executable was not found.');
    await new Promise((resolve, reject) => {
      const browser = spawn(edge, ['--app=' + edgeAppUrl], { detached: true, stdio: 'ignore' });
      browser.once('error', reject);
      browser.once('spawn', () => {
        browser.unref();
        resolve();
      });
    });
    return;
  }
  await new Promise((resolve, reject) => {
    const browser = spawn('cmd.exe', ['/d', '/c', 'start', '""', baseUrl], {
      windowsHide: true, stdio: 'ignore',
    });
    browser.once('error', reject);
    browser.once('exit', code => {
      if (code === 0) resolve();
      else reject(new Error('Could not open the browser. Visit ' + baseUrl));
    });
  });
}

async function main() {
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid workshop port.');
  if (!existsSync(server)) throw new Error('CloudCLI UI dependencies are missing: ' + server);
  applyWestcottTheme();
  hideCodexChatConsole();
  hideBackgroundConsoles();
  installPeerCheck();
  mkdirSync(dataDir, { recursive: true });
  createPeerKey(dataDir);
  const existing = await probePeer(baseUrl, dataDir);
  if (existing.ready) {
    await openBrowser();
    console.log(baseUrl);
    return;
  }
  if (existing.answered) throw new Error('Port ' + port + ' is occupied by a service that could not be verified.');

  const output = openSync(log, 'a');
  const processHandle = spawn(process.execPath, [server], {
    cwd: workdir,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HOST: '127.0.0.1',
      SERVER_PORT: port,
      PORT: port,
      ...(existsSync(claude) && !process.env.CLAUDE_CLI_PATH ? { CLAUDE_CLI_PATH: claude } : {}),
      PATH: [dirname(claude), dirname(process.execPath), process.env.PATH].join(';'),
      DATABASE_PATH: join(dataDir, 'auth.db'),
      EW_WORKSHOP_KEY_FILE: keyPath(dataDir),
    },
    detached: true,
    windowsHide: true,
    stdio: ['ignore', output, output],
  });
  closeSync(output);
  let startError;
  processHandle.on('error', error => { startError = error; });
  processHandle.unref();

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (startError) throw startError;
    if (processHandle.exitCode !== null) throw new Error('CloudCLI UI exited. See ' + log);
    if ((await probePeer(baseUrl, dataDir)).ready) {
      await openBrowser();
      console.log(baseUrl);
      return;
    }
    await delay(500);
  }
  throw new Error('CloudCLI UI did not become ready. See ' + log);
}

main().catch(error => {
  console.error(error.message);
  try {
    mkdirSync(dataDir, { recursive: true });
    appendFileSync(log, `[${new Date().toISOString()}] Launcher: ${error.message}\n`);
  } catch (logError) {
    console.error(logError.message);
  }
  process.exitCode = 1;
});
