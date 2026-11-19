'use strict';
const { createHmac, randomBytes, timingSafeEqual } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const keyPath = dataDir => join(dataDir, 'workshop-peer.key');

function createPeerKey(dataDir) {
  try {
    writeFileSync(keyPath(dataDir), randomBytes(32), { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
  }
  if (readFileSync(keyPath(dataDir)).length !== 32) throw Error('Workshop identity key is invalid.');
}

async function probePeer(baseUrl, dataDir, timeoutMs = 1250) {
  const nonce = randomBytes(24).toString('hex');
  let response;
  try {
    response = await fetch(baseUrl + '/__westcott/workshop-health?nonce=' + nonce, {
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
      cache: 'no-store'
    });
  } catch (error) {
    const code = error.cause?.code;
    return {
      ready: false,
      answered: code !== 'ECONNREFUSED',
      timeout: error.name === 'TimeoutError'
    };
  }
  try {
    if (response.ok && response.headers.get('content-type')?.startsWith('application/json')) {
      const body = await response.json();
      const key = readFileSync(keyPath(dataDir));
      if (key.length === 32 && body.status === 'ok' && /^[0-9a-f]{64}$/.test(body.proof)) {
        const expected = createHmac('sha256', key).update(nonce).digest();
        if (timingSafeEqual(expected, Buffer.from(body.proof, 'hex'))) return { ready: true, answered: true };
      }
    }
  } catch {}
  return { ready: false, answered: true };
}

module.exports = { createPeerKey, keyPath, probePeer };
