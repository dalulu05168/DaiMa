'use strict';
// 剧本工坊：把本机 CloudCLI（Claude Code UI，http://127.0.0.1:3001）嵌进主窗口。
// CloudCLI 平时由「启动」文件夹里的 Westcott CloudCLI 开机自启；没在跑时，这里用它自己的启动器补启动（不开浏览器）。
const fs = require('node:fs'),
  path = require('node:path'),
  { spawn } = require('node:child_process');
const { app, WebContentsView } = require('electron');

const PORT = process.env.EW_WORKSHOP_PORT || '3001';
const BASE = 'http://127.0.0.1:' + PORT;
const LEGACY_ROOT = path.join(process.env.USERPROFILE || '', 'Desktop', 'Westcott-Codex', 'claudecodeui-local');
const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write', 'notifications', 'fullscreen']);

function installation() {
  const bundled = path.join(process.resourcesPath, 'workshop');
  const root = fs.existsSync(path.join(bundled, 'start-local.cjs')) ? bundled : LEGACY_ROOT;
  const legacyData = path.join(LEGACY_ROOT, 'data');
  const data = process.env.EW_WORKSHOP_DATA_DIR || (
    root === LEGACY_ROOT || fs.existsSync(path.join(legacyData, 'auth.db'))
      ? legacyData
      : path.join(app.getPath('appData'), 'ELLERY WESTCOTT', 'CloudCLI')
  );
  return { root, data };
}

async function probe(timeoutMs) {
  const { root, data } = installation();
  const peer = path.join(root, 'workshop-peer.cjs');
  if (!fs.existsSync(peer)) return { ready: false, answered: false };
  return require(peer).probePeer(BASE, data, timeoutMs);
}

function nodeExe(root) {
  const bundled = path.join(root, 'runtime', 'node.exe');
  if (fs.existsSync(bundled)) return bundled;
  try {
    const p = fs.readFileSync(path.join(root, 'node-path.txt'), 'utf8').trim();
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return 'node.exe';
}

let starting = null;
// 确保 CloudCLI 在运行；已在运行时立即返回。
function ensureCloudCli() {
  if (starting) return starting;
  starting = (async () => {
    const { root, data } = installation();
    const launcher = path.join(root, 'start-local.cjs');
    if (!fs.existsSync(launcher)) throw Error('找不到 CloudCLI 启动器：' + launcher);
    const first = await probe();
    if (first.ready) return;
    if (first.answered) throw Error(PORT + ' 端口已有服务，但身份验证未通过。请检查 CloudCLI 后台进程。');
    const child = spawn(nodeExe(root), [launcher, '--no-browser'], {
      cwd: root,
      env: { ...process.env, EW_WORKSHOP_DATA_DIR: data, EW_WORKSHOP_PORT: PORT },
      detached: true,
      windowsHide: true,
      stdio: ['ignore', 'ignore', 'pipe']
    });
    const log = path.join(data, 'cloudcli.log');
    await new Promise((resolve, reject) => {
      let stderr = '';
      const timeout = setTimeout(() => {
        child.kill();
        reject(Error('CloudCLI 启动超时，请查看 ' + log));
      }, 41000);
      child.stderr?.setEncoding('utf8');
      child.stderr?.on('data', chunk => { stderr = (stderr + chunk).slice(-1200); });
      child.once('error', error => {
        clearTimeout(timeout);
        reject(Error('CloudCLI 启动失败：' + error.message));
      });
      child.once('close', (code, signal) => {
        clearTimeout(timeout);
        if (code === 0) resolve();
        else reject(Error('CloudCLI 启动失败（' + (code ?? signal) + '）：' + (stderr.trim().split(/\r?\n/).at(-1) || log)));
      });
    });
    if (!(await probe()).ready) throw Error('CloudCLI 已退出，服务验证未通过。请查看 ' + log);
  })().finally(() => { starting = null; });
  return starting;
}

// 免密登录：读取 CloudCLI 本机数据库里的签名密钥和本地账号，签一个与它自己登录时相同格式的凭证（HS256，7 天）。
// 只在本机使用，凭证只交给 127.0.0.1:3001 页面；读取失败就退回 CloudCLI 自己的登录页。
function mintToken() {
  const crypto = require('node:crypto');
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(path.join(installation().data, 'auth.db'), { readOnly: true });
  try {
    const secret = process.env.JWT_SECRET || db.prepare("select value from app_config where key='jwt_secret'").get()?.value;
    const user = db.prepare('select id, username from users where is_active = 1 order by id limit 1').get();
    if (!secret || !user) return null;
    const b64 = v => Buffer.from(JSON.stringify(v)).toString('base64url');
    const iat = Math.floor(Date.now() / 1000);
    const body = b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ userId: user.id, username: user.username, iat, exp: iat + 7 * 86400 });
    return body + '.' + crypto.createHmac('sha256', secret).update(body).digest('base64url');
  } finally {
    db.close();
  }
}

function sameOrigin(url) {
  try { return new URL(url).origin === BASE; } catch { return false; }
}

async function createWorkshopModule(m, { win, views, controller, emit, viewBounds, openExternal }) {
  emit(m.id, 'loading', '正在连接剧本工坊…');
  await ensureCloudCli();
  const view = new WebContentsView({
    webPreferences: {
      partition: 'persist:ew-workshop',
      preload: path.join(__dirname, 'workshop-preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: false
    }
  });
  const contents = view.webContents;
  // This private channel is scoped to this view and its main frame.
  contents.ipc.on('workshop:session', event => {
    let token = null;
    if (event.senderFrame === contents.mainFrame && sameOrigin(event.senderFrame.url)) {
      try { token = mintToken(); } catch {}
    }
    event.returnValue = token;
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (sameOrigin(url)) void contents.loadURL(url).catch(() => {});
    else openExternal(url);
    return { action: 'deny' };
  });
  for (const eventName of ['will-navigate', 'will-redirect']) {
    contents.on(eventName, (event, url) => {
      if (!sameOrigin(url)) {
        event.preventDefault();
        openExternal(url);
      }
    });
  }
  contents.session.setPermissionRequestHandler((_c, permission, respond) => respond(ALLOWED_PERMISSIONS.has(permission)));
  contents.session.setPermissionCheckHandler((_c, permission) => ALLOWED_PERMISSIONS.has(permission));
  contents.on('render-process-gone', () => {
    if (views.get(m.id) !== view) return;
    views.delete(m.id);
    win.contentView.removeChildView(view);
    controller.invalidate(m.id);
    if (!contents.isDestroyed()) contents.close();
    emit(m.id, 'error', '剧本工坊页面已退出，点击标签重新打开');
  });
  view.setBackgroundColor('#282D30');
  view.setBounds(viewBounds());
  view.setVisible(false);
  win.contentView.addChildView(view);
  views.set(m.id, view);
  try {
    await contents.loadURL(BASE + '/');
  } catch (e) {
    if (views.get(m.id) === view) {
      views.delete(m.id);
      win.contentView.removeChildView(view);
    }
    if (!contents.isDestroyed()) contents.close();
    throw Error('无法打开剧本工坊：' + e.message);
  }
  return { view };
}

async function selfCheck() {
  const { root } = installation();
  if (!fs.existsSync(path.join(root, 'start-local.cjs'))) return ['error', '缺少 CloudCLI 启动器'];
  const status = await probe(5000);
  if (status.timeout) return ['warn', '剧本工坊后台响应较慢，请稍候重试'];
  if (!status.ready) return [status.answered ? 'error' : 'warn',
    status.answered ? '端口已占用或本地服务身份无法验证' : '后台未运行，打开剧本工坊时自动启动'];
  let token;
  try { token = mintToken(); } catch {}
  if (!token) return ['warn', '后台已就绪，首次打开时需创建本地账号'];
  const auth = await fetch(BASE + '/api/auth/user', {
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(5000)
  });
  if (!auth.ok) return ['error', '后台已就绪，当前本地登录验证失败（HTTP ' + auth.status + '）'];
  return ['ok', '后台及本地登录已验证（端口 ' + PORT + '）'];
}

module.exports = { createWorkshopModule, ensureCloudCli, probe, selfCheck };
