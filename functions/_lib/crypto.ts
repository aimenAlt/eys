/**
 * Web Crypto helpers. Everything runs on crypto.subtle so the same code works
 * in Workers and in the Node test runner.
 *
 * Keys used for hashing and encryption are sub-keys derived from AI_ADMIN_KEY
 * with a fixed label, never the raw admin key itself.
 */

type Bytes = Uint8Array<ArrayBuffer>;

const encoder = new TextEncoder();

export const KEY_LABELS = {
  phoneHash: 'eys-ai-intake/phone-hash/v1',
  ipHash: 'eys-ai-intake/ip-hash/v1',
  /** Duplicate key for a request sent without an address (its job text). */
  jobHash: 'eys-ai-intake/job-hash/v1',
  tokenKey: 'eys-ai-intake/jobber-token-key/v1',
} as const;

function utf8(value: string): Bytes {
  return encoder.encode(value) as Bytes;
}

export function base64url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(value: string): Bytes {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Bytes {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** URL-safe random string with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return base64url(randomBytes(bytes));
}

export async function sha256(value: string | Bytes): Promise<Bytes> {
  const data = typeof value === 'string' ? utf8(value) : value;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

async function hmacKey(secret: Bytes): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

export async function hmac(secret: string | Bytes, message: string): Promise<Bytes> {
  const key = await hmacKey(typeof secret === 'string' ? utf8(secret) : secret);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(message)));
}

/** HMAC(adminKey, label): a purpose-bound key that never exposes the admin key. */
export async function deriveSubkey(adminKey: string, label: string): Promise<Bytes> {
  return hmac(adminKey, label);
}

/** Keyed, non-reversible hash for phone numbers, IPs and job text stored in D1. */
export async function keyedHash(adminKey: string, label: string, value: string): Promise<string> {
  const subkey = await deriveSubkey(adminKey, label);
  return base64url(await hmac(subkey, value));
}

/**
 * Constant-time string comparison: both sides are hashed first, so the
 * compared buffers always have the same length and the loop never exits early.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

/** PKCE S256 code challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return base64url(await sha256(verifier));
}

async function tokenCipherKey(adminKey: string): Promise<CryptoKey> {
  const raw = await deriveSubkey(adminKey, KEY_LABELS.tokenKey);
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** AES-GCM so a D1 console query never shows a usable Jobber token. */
export async function encryptSecret(adminKey: string, plaintext: string): Promise<string> {
  const iv = randomBytes(12);
  const key = await tokenCipherKey(adminKey);
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, utf8(plaintext)));
  const out = new Uint8Array(iv.length + sealed.length);
  out.set(iv, 0);
  out.set(sealed, iv.length);
  return `v1.${base64url(out)}`;
}

/** Null when the value was sealed under a different admin key or is corrupt. */
export async function decryptSecret(adminKey: string, stored: string): Promise<string | null> {
  if (!stored.startsWith('v1.')) return null;
  try {
    const bytes = fromBase64url(stored.slice(3));
    const key = await tokenCipherKey(adminKey);
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.slice(0, 12) },
      key,
      bytes.slice(12),
    );
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
