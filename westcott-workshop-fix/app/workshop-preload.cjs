'use strict';

const { ipcRenderer } = require('electron');

try {
  // The main process checks the view, frame and verified local origin.
  if (process.isMainFrame) {
    const token = ipcRenderer.sendSync('workshop:session');
    if (typeof token === 'string' && token) localStorage.setItem('auth-token', token);
  }
} catch {}
