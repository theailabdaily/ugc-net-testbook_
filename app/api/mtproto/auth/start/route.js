// app/api/mtproto/auth/start/route.js
// Step 1 of MTProto auth: accept phone number, ask Telegram to send a login code,
// save partial gramjs session to Supabase, return a token the client uses for the next steps.

import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export const dynamic     = 'force-dynamic';
export const maxDuration = 30;
export const runtime     = 'nodejs';

const SB_URL     = process.env.SUPABASE_URL;
const SB_KEY     = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_ID     = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const API_HASH   = process.env.TELEGRAM_API_HASH || '';
const PASSPHRASE = process.env.MTPROTO_SETUP_PASSPHRASE || '';

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const silentLogger = { warn: () => {}, info: () => {}, error: console.error, debug: () => {} };

export async function POST(request) {
  if (!sb)                   return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  if (!API_ID || !API_HASH)  return Response.json({ ok: false, error: 'telegram_api_credentials_missing' }, { status: 500 });
  if (!PASSPHRASE)           return Response.json({ ok: false, error: 'setup_passphrase_not_configured' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  const { phone, passphrase } = body || {};
  if (!phone || !passphrase) return Response.json({ ok: false, error: 'missing_fields' }, { status: 400 });
  if (passphrase !== PASSPHRASE) return Response.json({ ok: false, error: 'invalid_passphrase' }, { status: 401 });

  const session = new StringSession('');
  const client  = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 3,
    useWSS:            true,
    baseLogger:        silentLogger,
  });

  try {
    await client.connect();
    const result = await client.sendCode({ apiId: API_ID, apiHash: API_HASH }, phone);
    const phoneCodeHash = result.phoneCodeHash;
    const sessionString = client.session.save();
    try { await client.disconnect(); } catch {}

    const token = crypto.randomBytes(16).toString('hex');
    const { error: upErr } = await sb.from('tg_mtproto_auth_state').upsert({
      token,
      phone,
      session_string:  sessionString,
      phone_code_hash: phoneCodeHash,
      step:            'code',
      updated_at:      new Date().toISOString(),
      expires_at:      new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }, { onConflict: 'token' });

    if (upErr) {
      console.error('[mtproto/start] supabase upsert:', upErr.message);
      return Response.json({ ok: false, error: 'supabase_upsert: ' + upErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, token, step: 'code', note: 'Code sent to your Telegram app. Enter it on the next screen.' });
  } catch (e) {
    try { await client.disconnect(); } catch {}
    console.error('[mtproto/start] error:', e.message);
    return Response.json({ ok: false, error: e.message || 'send_code_failed' }, { status: 500 });
  }
}
