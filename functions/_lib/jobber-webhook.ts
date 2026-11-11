import { timingSafeEqual } from './crypto.ts';

/**
 * Jobber signs every webhook with `X-Jobber-Hmac-SHA256`: the base64 HMAC-SHA256
 * of the raw request body, keyed with the app's OAuth client secret.
 * https://developer.getjobber.com/docs/using_jobbers_api/setting_up_webhooks
 */
export async function jobberWebhookSignature(secret: string, rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody)));
  let binary = '';
  for (const byte of sig) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function verifyJobberWebhook(secret: string | null, header: string | null, rawBody: string): Promise<boolean> {
  if (!secret || !header) return false;
  return timingSafeEqual(header.trim(), await jobberWebhookSignature(secret, rawBody));
}
