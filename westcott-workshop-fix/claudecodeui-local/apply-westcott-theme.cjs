const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync, renameSync } = require('node:fs');
const { join } = require('node:path');

const theme = join(__dirname, 'theme');
const dist = join(__dirname, 'node_modules', '@cloudcli-ai', 'cloudcli', 'dist');
const marker = /[ \t]*<!-- Westcott theme -->[\s\S]*?<!-- End Westcott theme -->\r?\n/;

function installAsset(source, extension) {
  const content = readFileSync(join(theme, source));
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 12);
  const name = `westcott-${hash}.${extension}`;
  const target = join(dist, 'assets', name);
  try {
    writeFileSync(target, content, { flag: 'wx' });
  } catch (error) {
    if (error.code !== 'EEXIST' || !readFileSync(target).equals(content)) throw error;
  }
  return `/assets/${name}`;
}

function applyWestcottTheme() {
  const file = join(dist, 'index.html');
  const original = readFileSync(file, 'utf8');
  const html = original.replace(marker, '');
  if ((html.match(/<\/head>/g) || []).length !== 1 || !/<html\b[^>]*>/.test(html)) {
    throw new Error('CloudCLI frontend entry has an unexpected HTML structure.');
  }
  const css = installAsset('westcott.css', 'css');
  const script = installAsset('force-dark.js', 'js');
  const workshop = installAsset('workshop-ui.js', 'js');
  const nl = original.includes('\r\n') ? '\r\n' : '\n';
  const block = [
    '    <!-- Westcott theme -->',
    `    <link rel="stylesheet" href="${css}">`,
    `    <script src="${script}"></script>`,
    `    <script src="${workshop}" defer></script>`,
    '    <!-- End Westcott theme -->',
    '  </head>',
  ].join(nl);
  const next = html
    .replace(/<html\b[^>]*>/, tag => tag.includes('data-westcott-theme') ? tag : tag.replace('>', ' data-westcott-theme="mint">'))
    .replace(/^\s*<\/head>/m, block);
  if (next !== original) {
    const temporary = file + '.westcott-' + process.pid + '.tmp';
    writeFileSync(temporary, next, { flag: 'wx' });
    renameSync(temporary, file);
  }
  return { css, script, workshop };
}

if (require.main === module) console.log(JSON.stringify(applyWestcottTheme()));
module.exports = { applyWestcottTheme };
