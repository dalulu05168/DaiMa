'use strict';
// 一键自检：逐项检查程序运行所需的环境、后台服务、数据源和设置。
// 每项结果：{ name, level: 'ok' | 'warn' | 'error', detail }。各项并行执行，单项超时不拖住其他项。
const fs = require('node:fs'),
  path = require('node:path'),
  { execFile } = require('node:child_process');

const LEVEL_ICON = { ok: '✅', warn: '⚠️', error: '❌' };
const UA = { 'User-Agent': 'Mozilla/5.0', 'Cache-Control': 'no-cache' };

function writable(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, `.ew-selfcheck-${process.pid}-${Date.now()}.tmp`);
  fs.writeFileSync(probe, 'ok');
  fs.rmSync(probe, { force: true });
}

function python(exe) {
  const probe = () => new Promise((resolve, reject) => {
    execFile(
      exe,
      ['-I', '-B', '-c', 'import requests,tzdata,sys;from PIL import Image;print(sys.version.split()[0])'],
      { cwd: path.dirname(exe), timeout: 30000, windowsHide: true },
      (error, stdout, stderr) => {
        if (!error) {
          const version = stdout.trim();
          if (/^3\.[0-9]+\.[0-9]+$/.test(version)) resolve(version);
          else reject(Error('Python 自检未返回有效版本号：' + (version || '无输出')));
          return;
        }
        const output = String(stderr || '').trim().split(/\r?\n/).filter(Boolean).at(-1);
        const code = typeof error.code === 'number' ? error.code >>> 0 : error.code;
        const timeout = error.killed === true && !output;
        const transient = timeout || ['EBUSY', 'EAGAIN'].includes(code) || code === 0xc0000142;
        const reason = timeout ? 'Python 启动或依赖导入超过 30 秒' :
          output || ('Python 启动失败：退出码 ' + (code ?? '未知') +
            (typeof code === 'number' ? '（0x' + code.toString(16).toUpperCase() + '）' : '') +
            (error.signal ? '，信号 ' + error.signal : ''));
        const failure = Error(reason);
        failure.transient = transient;
        reject(failure);
      }
    );
  });
  return probe().catch(first => {
    if (!first.transient) throw first;
    return new Promise(resolve => setTimeout(resolve, 300)).then(probe).catch(last => {
      throw Error(last.message + '；已自动重试一次');
    });
  });
}

async function getJson(url, timeout = 8000) {
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw Error('HTTP ' + res.status);
  return res.json();
}

async function reachable(url, check) {
  const started = Date.now();
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw Error('HTTP ' + res.status);
  if (check) check(await res.text());
  return Date.now() - started;
}

function checks({ dataRoot, modulesRoot, runtimeRoot, desktopDir, services, env = process.env }) {
  const { calendarWarnings } = require(path.join(modulesRoot, 'market', 'calendar-check.cjs'));
  return [
    [
      '数据目录',
      async () => {
        writable(dataRoot);
        return ['ok', dataRoot];
      }
    ],
    [
      '导出目录（桌面）',
      async () => {
        writable(desktopDir);
        return ['ok', desktopDir];
      }
    ],
    [
      'Python 运行环境',
      async () => {
        const exe = env.EW_PYTHON || path.join(runtimeRoot, 'python', 'python.exe');
        if (!fs.existsSync(exe)) return ['error', '找不到 ' + exe + '，开盘指标和问答导出无法使用'];
        return ['ok', 'Python ' + (await python(exe)) + '，requests / Pillow / tzdata 可用'];
      }
    ],
    ...['three', 'tools'].map(project => [
      project === 'three' ? '后台服务：战绩表 / 交易系统' : '后台服务：开盘指标 / 问答',
      async () => {
        const instance = await services.start(project);
        const health = await getJson(instance.url + '/api/trade/health', 5000);
        if (!health.ok) throw Error('健康检查未通过');
        return ['ok', '运行中（端口 ' + instance.port + '）'];
      }
    ]),
    ['剧本工坊', () => require('./workshop.cjs').selfCheck()],
    [
      '交易日历',
      async () => {
        const calendar = JSON.parse(fs.readFileSync(path.join(modulesRoot, 'market', 'trading-calendar.json'), 'utf8'));
        const { missing, provisional } = calendarWarnings(calendar);
        if (missing.length) return ['error', missing.join('；')];
        if (provisional.length)
          return ['warn', provisional.map(p => p.split('：')[0] + '，BVB 公布后需核对').join('；')];
        return ['ok', '已覆盖今年和明年'];
      }
    ],
    [
      '谷歌文档同步',
      async () => {
        const instance = await services.start('three');
        const s = await getJson(instance.url + '/api/trade/documents/status', 5000);
        if (!s.configured) return ['warn', '还没有设置谷歌文档链接，战绩表不会自动同步'];
        const error = s.lastError || s.autoSync?.lastError;
        if (error) return ['error', error];
        const last = s.autoSync?.lastAt ? '，上次同步 ' + new Date(s.autoSync.lastAt).toLocaleString('zh-CN') : '';
        return ['ok', (s.autoSync?.enabled ? `每 ${s.autoSync.minutes} 分钟自动同步` : '自动同步已关闭') + last];
      }
    ],
    [
      '数据源：Yahoo（美股）',
      async () => {
        const ms = await reachable(
          'https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?range=1d&interval=1d',
          t => {
            if (!JSON.parse(t)?.chart?.result?.[0]?.meta?.regularMarketPrice) throw Error('返回内容缺少报价');
          }
        );
        return ['ok', `可连接（${ms} 毫秒）`];
      }
    ],
    [
      '数据源：TradingView（核对前收）',
      async () => {
        const ms = await reachable(
          'https://scanner.tradingview.com/symbol?symbol=SP%3ASPX&fields=close%2Cclose%5B1%5D&no_404=true',
          t => {
            if (typeof JSON.parse(t)?.close !== 'number') throw Error('返回内容缺少报价');
          }
        );
        return ['ok', `可连接（${ms} 毫秒）`];
      }
    ],
    [
      '数据源：BVB 官网（罗股）',
      async () => {
        const ms = await reachable('https://www.bvb.ro/FinancialInstruments/Indices/IndicesProfiles.aspx?i=BET', t => {
          if (!/\bBET\b/.test(t)) throw Error('页面缺少 BET 指数');
        });
        return ['ok', `可连接（${ms} 毫秒）`];
      }
    ],
    [
      'AI 画质增强',
      async () => {
        const sharpVersion=require('sharp').versions.sharp;
        const accelerated=require('./inference-runner.cjs').preferred('realesrgan-x4plus')!=='ncnn';
        const exe = env.EW_AI_EXE,
          models = env.EW_AI_MODELS;
        if (!exe || !fs.existsSync(exe))
          return [
            'warn',
            '找不到 Real-ESRGAN 程序（' + exe + '），图片小助手的 AI 增强不可用；模板已预先增强，导出不受影响'
          ];
        if (!models || !fs.existsSync(models)) return ['warn', '找不到模型文件夹（' + models + '）'];
        return ['ok', exe+'；Sharp '+sharpVersion+'；'+(accelerated?'OpenVINO FP32 已安装（GPU优先，失败回退）':'Vulkan')];
      }
    ]
  ];
}

async function runSelfCheck(options) {
  return Promise.all(
    checks(options).map(async ([name, fn]) => {
      try {
        const [level, detail] = await fn();
        return { name, level, detail };
      } catch (e) {
        const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
        return { name, level: 'error', detail: timeout ? '超时未响应' : e?.message || String(e) };
      }
    })
  );
}

function summary(results) {
  const count = level => results.filter(r => r.level === level).length;
  const message = count('error')
    ? `自检发现 ${count('error')} 项异常`
    : count('warn')
      ? `自检通过，有 ${count('warn')} 项提醒`
      : '自检全部通过';
  const detail = results.map(r => `${LEVEL_ICON[r.level]} ${r.name}：${r.detail}`).join('\n\n');
  return { message, detail, counts: { ok: count('ok'), warn: count('warn'), error: count('error') } };
}

module.exports = { runSelfCheck, summary };
