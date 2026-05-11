// app/api/mtproto/auth/verify-2fa/route.js
// Step 3 (only if account has 2FA): submit cloud password, get final session string.

import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import { computeCheck } from 'telegram/Password.js';
import { createClient } from '@supabase/supabase-js';

export const dynamic     = 'force-dynamic';
export const maxDuration = 30;
export const runtime     = 'nodejs';

const SB_URL    = process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_ID    = parseInt(process.env.TELEGRAM_API_ID || '0', 10);
const API_HASH  = process.env.TELEGRAM_API_HASH || '';

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

const silentLogger = { warn: () => {}, info: () => {}, error: console.error, debug: () => {} };

export async function POST(request) {
  if (!sb)                  return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  if (!API_ID || !API_HASH) return Response.json({ ok: false, error: 'telegram_api_credentials_missing' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  const { token, password } = body || {};
  if (!token || !password) return Response.json({ ok: false, error: 'missing_fields' }, { status: 400 });

  const { data: state, error: readErr } = await sb
    .from('tg_mtproto_auth_state')
    .select('*')
    .eq('token', token)
    .single();

  if (readErr || !state)                       return Response.json({ ok: false, error: 'invalid_token' }, { status: 404 });
  if (new Date(state.expires_at) < new Date()) return Response.json({ ok: false, error: 'token_expired' }, { status: 410 });
  if (state.step !== '2fa')                    return Response.json({ ok: false, error: 'wrong_step', currentStep: state.step }, { status: 400 });

  const session = new StringSession(state.session_string);
  const client  = new TelegramClient(session, API_ID, API_HASH, {
    connectionRetries: 3,
    useWSS:            true,
    baseLogger:        silentLogger,
  });

  try {
    await client.connect();
    const passwordInfo = await client.invoke(new Api.account.GetPassword());
    const check        = await computeCheck(passwordInfo, password);
    await client.invoke(new Api.auth.CheckPassword({ password: check }));

    const finalSession = client.session.save();
    try { await client.disconnect(); } catch {}

    await sb.from('tg_mtproto_auth_state').update({
      session_string: finalSession,
      step:           'done',
      updated_at:     new Date().toISOString(),
    }).eq('token', token);

    return Response.json({ ok: true, sessionString: finalSession });
  } catch (e) {
    try { await client.disconnect(); } catch {}
    console.error('[mtproto/verify-2fa] error:', e.message);
    return Response.json({ ok: false, error: e.message || 'check_password_failed' }, { status: 500 });
  }
}
