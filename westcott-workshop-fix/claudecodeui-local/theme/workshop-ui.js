// 剧本工坊一体化：侧边栏标题、快捷指令胶囊、剧本卡片标记、技术步骤折叠。
// 只给页面元素加 data-ew-* 属性或插入自己的节点，不改 CloudCLI 自身逻辑；样式在 westcott.css。
(() => {
  const QUICK = [
    ['写上午场', '写上午场'],
    ['写下午场', '写下午场'],
    ['写晚上场', '写晚上场'],
    ['压缩上下文', '/compact']
  ];
  const opened = new Set();

  function setTitle() {
    for (const h1 of document.querySelectorAll('h1')) {
      if (h1.dataset.ewTitle !== undefined) continue;
      if (h1.textContent.trim() !== 'CloudCLI') continue;
      h1.dataset.ewTitle = '';
      h1.textContent = '剧本工坊';
    }
  }

  function fillDraft(form, text) {
    const box = form.querySelector('textarea');
    if (!box || box.disabled || box.readOnly) return;
    if (box.value.trim() && box.value !== text) {
      box.focus();
      const note = form.parentElement.querySelector('.ew-quick-note');
      if (note) note.textContent = '输入框已有草稿。请先保存或清空草稿，再填入快捷指令。';
      return;
    }
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(box, text);
    box.dispatchEvent(new Event('input', { bubbles: true }));
    box.focus();
    const note = form.parentElement.querySelector('.ew-quick-note');
    if (note) note.textContent = '已填入指令，确认后发送。';
  }

  function quickBar() {
    const form = document.querySelector('form[data-slot="prompt-input"]');
    if (!form || !form.parentElement) return;
    const host = form.parentElement;
    let bar = host.querySelector(':scope > .ew-quick');
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ew-quick';
      for (const [label, command] of QUICK) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.title = '填入：' + command;
        button.addEventListener('click', () => {
          const currentForm = host.querySelector('form[data-slot="prompt-input"]');
          if (currentForm) fillDraft(currentForm, command);
        });
        bar.append(button);
      }
      const note = document.createElement('span');
      note.className = 'ew-quick-note';
      note.setAttribute('role', 'status');
      bar.append(note);
      host.insertBefore(bar, form);
    }
  }

  function scriptCards() {
    for (const block of document.querySelectorAll('.chat-message .prose div.group')) {
      if (!block.querySelector(':scope > pre')) continue;
      const label = block.querySelector(':scope > div > span');
      const isText = !label || /^(text|txt|plaintext)$/i.test(label.textContent.trim());
      if (isText && block.dataset.ewScript === undefined) block.dataset.ewScript = '';
    }
  }

  function isToolStep(message) {
    if (message.classList.contains('user')) return false;
    // 需要用户点「允许/拒绝」的步骤不折叠
    for (const button of message.querySelectorAll('button, [role="button"]')) {
      const label = [button.textContent, button.getAttribute('aria-label'), button.getAttribute('title')].join(' ');
      if (/允许|拒绝|批准|授权|\b(?:allow|deny|approve|reject|permission|authorize)\b/i.test(label)) return false;
    }
    if (message.classList.contains('tool')) return true;
    if (!message.classList.contains('assistant')) return false;
    const prose = message.querySelector('.prose');
    return !prose || !prose.textContent.trim();
  }

  function keyOf(message) {
    return message.dataset.messageTimestamp || message.parentElement?.dataset.messageTimestamp || '';
  }

  function foldTools() {
    const messages = [...document.querySelectorAll('.chat-message')];
    let run = [];
    const flush = () => {
      if (!run.length) return;
      const first = run[0];
      const key = keyOf(first);
      const errors = run.filter(m => /错误|Denied|Permission request timed out/.test(m.textContent)).length;
      const summary = `已折叠 ${run.length} 个技术步骤${errors ? `（含 ${errors} 个错误）` : ''}`;
      const open = opened.has(key);
      for (const m of run) {
        if (m.dataset.ewTool === undefined) m.dataset.ewTool = '';
        if (m !== first && m.dataset.ewFirst !== undefined) delete m.dataset.ewFirst;
        if (open) { if (m.dataset.ewOpen === undefined) m.dataset.ewOpen = ''; }
        else if (m.dataset.ewOpen !== undefined) delete m.dataset.ewOpen;
      }
      if (first.dataset.ewFirst === undefined) first.dataset.ewFirst = '';
      if (first.dataset.ewSummary !== summary) first.dataset.ewSummary = summary;
      if (first.dataset.ewKey !== key) first.dataset.ewKey = key;
      run = [];
    };
    for (const m of messages) {
      if (keyOf(m) && isToolStep(m)) run.push(m);
      else {
        flush();
        deleteToolMarkers(m);
      }
    }
    flush();
  }

  function deleteToolMarkers(message) {
    for (const name of ['ewTool', 'ewFirst', 'ewOpen', 'ewSummary', 'ewKey'])
      if (message.dataset[name] !== undefined) delete message.dataset[name];
  }

  document.addEventListener('click', event => {
    const first = event.target.closest && event.target.closest('.chat-message[data-ew-first]');
    if (!first) return;
    const open = first.dataset.ewOpen !== undefined;
    // 展开后只有点顶部摘要行才收起，避免误触里面的按钮
    if (open && event.clientY - first.getBoundingClientRect().top > 34) return;
    const key = first.dataset.ewKey;
    if (!key) return;
    if (open) opened.delete(key);
    else opened.add(key);
    event.preventDefault();
    event.stopPropagation();
    foldTools();
  }, true);

  let pending = false;
  function apply() {
    pending = false;
    try {
      setTitle();
      quickBar();
      scriptCards();
      foldTools();
    } catch (error) {
      console.warn('[workshop-ui]', error);
    }
  }
  const schedule = () => {
    if (pending) return;
    pending = true;
    setTimeout(apply, 120);
  };
  const start = () => {
    apply();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
