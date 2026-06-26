/**
 * Base64 <-> Uint8Array helpers that work under Hermes (no atob/btoa).
 * Pure JS — unit tested.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const LOOKUP = (() => {
  const t = new Int16Array(256).fill(-1);
  for (let i = 0; i < B64.length; i++) t[B64.charCodeAt(i)] = i;
  return t;
})();

export function uint8ToBase64(bytes: Uint8Array): string {
  let out = '';
  let i = 0;
  for (; i + 2 < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  const rem = bytes.length - i;
  if (rem === 1) {
    const n = bytes[i] << 16;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + '==';
  } else if (rem === 2) {
    const n = (bytes[i] << 16) | (bytes[i + 1] << 8);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '=';
  }
  return out;
}

export function base64ToUint8(b64: string): Uint8Array {
  const s = b64.replace(/[^A-Za-z0-9+/]/g, ''); // drop '=' and whitespace
  const fullGroups = Math.floor(s.length / 4);
  const remChars = s.length - fullGroups * 4; // 0, 2 or 3
  const outLen = fullGroups * 3 + (remChars === 2 ? 1 : remChars === 3 ? 2 : 0);
  const out = new Uint8Array(outLen);
  let p = 0;
  let i = 0;
  for (let g = 0; g < fullGroups; g++, i += 4) {
    const n =
      (LOOKUP[s.charCodeAt(i)] << 18) |
      (LOOKUP[s.charCodeAt(i + 1)] << 12) |
      (LOOKUP[s.charCodeAt(i + 2)] << 6) |
      LOOKUP[s.charCodeAt(i + 3)];
    out[p++] = (n >> 16) & 255;
    out[p++] = (n >> 8) & 255;
    out[p++] = n & 255;
  }
  if (remChars === 2) {
    const n = (LOOKUP[s.charCodeAt(i)] << 18) | (LOOKUP[s.charCodeAt(i + 1)] << 12);
    out[p++] = (n >> 16) & 255;
  } else if (remChars === 3) {
    const n =
      (LOOKUP[s.charCodeAt(i)] << 18) |
      (LOOKUP[s.charCodeAt(i + 1)] << 12) |
      (LOOKUP[s.charCodeAt(i + 2)] << 6);
    out[p++] = (n >> 16) & 255;
    out[p++] = (n >> 8) & 255;
  }
  return out;
}
