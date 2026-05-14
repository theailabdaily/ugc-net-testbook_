// app/api/cron/capture-competitor-subs/route.js
// Snapshots subscriber count + title for every active competitor in tg_competitor_registry.
// Idempotent — UPSERT keyed on (username, date). Run multiple times per day, only last call wins.
// Authentication: x-cron-secret header OR Authorization: Bearer

import { createClient } from '@supabase/supabase-js';

export const dynamic     = 'force-dynamic';
export const runtime     = 'nodejs';
export const maxDuration = 60;

const SB_URL      = process.env.SUPABASE_URL;
const SB_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN   = process.env.TELEGRAM_BOT_TOKEN;
const CRON_SECRET = process.env.CRON_SECRET || process.env.TELEGRAM_WEBHOOK_SECRET;

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// Fetch metadata for one channel via Telegram bot API
async function fetchOne(username) {
  const timeout = (ms) => new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms));
  try {
    const [chatRes, countRes] = await Promise.all([
      Promise.race([fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`), timeout(6000)]),
      Promise.race([fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount?chat_id=@${username}`), timeout(6000)]),
    ]);
    const chatData  = await chatRes.json();
    const countData = await countRes.json();
    if (!chatData.ok) return { username, is_live: false, subscribers: 0, title: null, description: null, error: chatData.description };
    return {
      username,
      is_live:     true,
      subscribers: countData.ok ? countData.result : 0,
      title:       chatData.result.title || null,
      description: chatData.result.description || null,
    };
  } catch (e) {
    return { username, is_live: false, subscribers: 0, title: null, description: null, error: e.message };
  }
}

export async function GET(request) {
  // Auth
  const headerSecret = request.headers.get('x-cron-secret');
  const authHeader   = request.headers.get('authorization');
  const vercelCron   = authHeader === `Bearer ${process.env.CRON_SECRET || ''}`;
  if (CRON_SECRET && headerSecret !== CRON_SECRET && !vercelCron) {
    return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  if (!BOT_TOKEN) return Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });

  const startedAt = new Date();
  try {
    // Get active competitors from registry
    const { data: registry, error: regErr } = await sb
      .from('tg_competitor_registry')
      .select('username')
      .eq('active', true)
      .limit(500);
    if (regErr) throw new Error('registry: ' + regErr.message);
    if (!registry || registry.length === 0) {
      return Response.json({ ok: true, message: 'no_competitors_in_registry', captured: 0 });
    }

    // IST date string for the snapshot key
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

    // Fetch in batches of 10 with small delay (avoid hammering bot API)
    const usernames = registry.map((r) => r.username);
    const BATCH = 10;
    const DELAY_MS = 250;
    const results = [];
    for (let i = 0; i < usernames.length; i += BATCH) {
      const batch = usernames.slice(i, i + BATCH);
      const batchResults = await Promise.all(batch.map(fetchOne));
      results.push(...batchResults);
      if (i + BATCH < usernames.length) await new Promise((r) => setTimeout(r, DELAY_MS));
    }

    // Upsert snapshots
    const rows = results.map((r) => ({
      username:    r.username,
      date:        today,
      subscribers: r.subscribers || 0,
      title:       r.title,
      description: r.description,
      is_live:     r.is_live,
      captured_at: new Date().toISOString(),
    }));

    const { error: upErr } = await sb.from('tg_competitor_subs_daily').upsert(rows, { onConflict: 'username,date' });
    if (upErr) throw new Error('upsert: ' + upErr.message);

    const live   = results.filter((r) => r.is_live).length;
    const failed = results.filter((r) => !r.is_live).length;
    const totalSubs = results.reduce((s, r) => s + (r.subscribers || 0), 0);

    return Response.json({
      ok: true,
      date: today,
      captured: rows.length,
      live,
      failed,
      total_subscribers_tracked: totalSubs,
      duration_ms: Date.now() - startedAt.getTime(),
      failed_channels: results.filter((r) => !r.is_live).map((r) => ({ username: r.username, error: r.error })),
    });
  } catch (e) {
    console.error('[cron capture-competitor-subs]', e.message);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
