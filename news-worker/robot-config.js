import { RequestError, digest } from './subscriptions.js';

const encoder = new TextEncoder();
const encryptionSecret = env => env.ROBOT_WEBHOOK_SECRET || env.NEWSLETTER_TOKEN_SECRET || env.ADMIN_TOKEN;
export const robotConfigured = env => Boolean(encryptionSecret(env));
export const ROBOT_SEND_MODES = { single: '单条汇总', multiple: '按板块分多条' };

export function normalizeSendMode(value = 'multiple') {
  if (typeof value !== 'string' || !Object.hasOwn(ROBOT_SEND_MODES, value)) throw new RequestError('请选择单条汇总或按板块分多条。');
  return value;
}

export function normalizeWebhook(value) {
  if (typeof value !== 'string' || value.length > 2048) throw new RequestError('请输入有效的机器人 webhook 地址。');
  try {
    const url = new URL(value.trim());
    const keys = [...url.searchParams.keys()];
    const key = url.searchParams.get('key');
    if (url.protocol !== 'https:' || url.hostname !== 'imtwo.zdxlz.com' || url.port ||
        url.pathname !== '/im-external/v1/webhook/send' || url.username || url.password || url.hash ||
        keys.length !== 1 || keys[0] !== 'key' || !/^[a-zA-Z0-9_-]{4,512}$/.test(key || '')) throw new Error();
    return `https://imtwo.zdxlz.com/im-external/v1/webhook/send?key=${key}`;
  } catch { throw new RequestError('目前支持 imtwo.zdxlz.com 的 HTTPS 群机器人 webhook，请从机器人详情页复制完整地址。'); }
}
export function webhookDisplay(url) { return `imtwo.zdxlz.com · key …${new URL(url).searchParams.get('key').slice(-4)}`; }
export async function webhookHash(env, url) {
  return digest(`liangzai-robot-identity-v1:${encryptionSecret(env)}:${url}`);
}
async function encryptionKey(env) {
  if (!robotConfigured(env)) throw new RequestError('机器人订阅服务尚未配置，请稍后再试。', 503);
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(`liangzai-robot-encryption-v1:${encryptionSecret(env)}`));
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function encryptWebhook(env, id, url) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(id) }, await encryptionKey(env), encoder.encode(url));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(ciphertext)))}`;
}
export async function decryptWebhook(env, subscriber) {
  const [nonce, encrypted] = subscriber.webhook_ciphertext.split('.');
  const decode = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decode(nonce), additionalData: encoder.encode(subscriber.id) }, await encryptionKey(env), decode(encrypted));
  return normalizeWebhook(new TextDecoder().decode(plaintext));
}
export function normalizeMentions(body) {
  const mode = body.mention_mode ?? 'none';
  if (!['none', 'members'].includes(mode)) throw new RequestError('请选择不 @ 或指定成员。');
  if (mode === 'none') return { mode, mobiles: [] };
  if (!Array.isArray(body.mention_mobiles) || !body.mention_mobiles.length || body.mention_mobiles.length > 20 ||
      body.mention_mobiles.some(value => typeof value !== 'string' || !/^\d{11,15}$/.test(value))) {
    throw new RequestError('请填写 1 至 20 位成员的手机号，每个号码为 11 至 15 位数字。');
  }
  return { mode, mobiles: [...new Set(body.mention_mobiles)] };
}
