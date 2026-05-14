// app/api/competitive-intel/route.js
// Aggregates competitive data: latest snapshot, growth windows, leaderboard, per-subject standings.
// Pure DB read — does NOT hit Telegram. Use /api/cron/capture-competitor-subs to refresh data.

import { createClient } from '@supabase/supabase-js';

export const dynamic     = 'force-dynamic';
export const runtime     = 'nodejs';
export const maxDuration = 30;

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// Find the closest snapshot for username on/before targetDate
function pickClosestOnOrBefore(snapshotsByUser, username, targetDate) {
  const userSnaps = snapshotsByUser[username];
  if (!userSnaps || userSnaps.length === 0) return null;
  // userSnaps already sorted DESC by date
  for (const s of userSnaps) {
    if (s.date <= targetDate) return s;
  }
  return null;
}

function istToday() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
}
function istDateOffset(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
}

export async function GET() {
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });

  try {
    const today    = istToday();
    const date7d   = istDateOffset(-7);
    const date30d  = istDateOffset(-30);
    const earliest = istDateOffset(-35);

    // 1) Registry — who we track
    const { data: registry, error: regErr } = await sb
      .from('tg_competitor_registry')
      .select('username, subject, display_title')
      .eq('active', true);
    if (regErr) throw new Error('registry: ' + regErr.message);

    // 2) All competitor snapshots within the last ~35 days (covers 7d + 30d windows)
    const { data: snaps, error: snapErr } = await sb
      .from('tg_competitor_subs_daily')
      .select('username, date, subscribers, title, is_live')
      .gte('date', earliest)
      .order('date', { ascending: false })
      .limit(50000);
    if (snapErr) throw new Error('snapshots: ' + snapErr.message);

    // Group snapshots by username (each value sorted DESC by date already)
    const byUser = {};
    for (const s of (snaps || [])) {
      const k = s.username.toLowerCase();
      if (!byUser[k]) byUser[k] = [];
      byUser[k].push(s);
    }

    // 3) Our own subscriber data — pull from tg_growth_daily (last 35 days)
    const { data: ourGrowth, error: ourErr } = await sb
      .from('tg_growth_daily')
      .select('chat_username, date, total_subs')
      .gte('date', earliest)
      .order('date', { ascending: false })
      .limit(50000);
    if (ourErr) throw new Error('our_growth: ' + ourErr.message);

    const ourByChannel = {};
    for (const r of (ourGrowth || [])) {
      const k = r.chat_username.toLowerCase();
      if (!ourByChannel[k]) ourByChannel[k] = [];
      ourByChannel[k].push({ date: r.date, subscribers: r.total_subs });
    }

    // 4) Our channel subject mapping — pull from tg_channel_meta_snapshots (latest title)
    const { data: ourMeta, error: metaErr } = await sb
      .from('tg_channel_meta_snapshots')
      .select('chat_username, title, captured_at')
      .order('captured_at', { ascending: false })
      .limit(2000);
    if (metaErr) throw new Error('meta: ' + metaErr.message);

    const ourTitleByCh = {};
    for (const m of (ourMeta || [])) {
      const k = m.chat_username.toLowerCase();
      if (!ourTitleByCh[k]) ourTitleByCh[k] = m.title;
    }

    // ─── COMPETITORS: latest snapshot + 7d/30d growth ───
    const competitorRows = (registry || []).map((r) => {
      const u = r.username.toLowerCase();
      const today_s = pickClosestOnOrBefore(byUser, u, today);
      const d7      = pickClosestOnOrBefore(byUser, u, date7d);
      const d30     = pickClosestOnOrBefore(byUser, u, date30d);

      const subs    = today_s?.subscribers || 0;
      const subs7d  = d7?.subscribers;
      const subs30d = d30?.subscribers;
      const change7d  = (subs7d  != null) ? (subs - subs7d)  : null;
      const change30d = (subs30d != null) ? (subs - subs30d) : null;
      const pct7d  = (subs7d  != null && subs7d  > 0) ? ((subs - subs7d)  / subs7d)  * 100 : null;
      const pct30d = (subs30d != null && subs30d > 0) ? ((subs - subs30d) / subs30d) * 100 : null;

      return {
        username:     r.username,
        subject:      r.subject,
        title:        today_s?.title || r.display_title || r.username,
        subs,
        subs_7d_ago:  subs7d ?? null,
        subs_30d_ago: subs30d ?? null,
        change_7d:    change7d,
        change_30d:   change30d,
        pct_7d:       pct7d  != null ? Math.round(pct7d  * 10) / 10 : null,
        pct_30d:      pct30d != null ? Math.round(pct30d * 10) / 10 : null,
        is_live:      today_s?.is_live ?? null,
        last_seen:    today_s?.date || null,
        is_ours:      false,
      };
    });

    // ─── OURS: latest from tg_growth_daily ───
    // (Subject mapping is held in the dashboard's SUBJECTS map, so we just return rows
    // keyed by username; the UI joins with its own SUBJECTS table for display.)
    const ourRows = Object.keys(ourByChannel).map((u) => {
      const sorted = ourByChannel[u].sort((a, b) => b.date.localeCompare(a.date));
      const today_s = sorted.find((s) => s.date <= today) || sorted[0];
      const d7  = sorted.find((s) => s.date <= date7d);
      const d30 = sorted.find((s) => s.date <= date30d);

      const subs    = today_s?.subscribers || 0;
      const subs7d  = d7?.subscribers;
      const subs30d = d30?.subscribers;
      const change7d  = (subs7d  != null) ? (subs - subs7d)  : null;
      const change30d = (subs30d != null) ? (subs - subs30d) : null;
      const pct7d  = (subs7d  != null && subs7d  > 0) ? ((subs - subs7d)  / subs7d)  * 100 : null;
      const pct30d = (subs30d != null && subs30d > 0) ? ((subs - subs30d) / subs30d) * 100 : null;

      return {
        username:     u,
        title:        ourTitleByCh[u] || u,
        subs,
        subs_7d_ago:  subs7d ?? null,
        subs_30d_ago: subs30d ?? null,
        change_7d:    change7d,
        change_30d:   change30d,
        pct_7d:       pct7d  != null ? Math.round(pct7d  * 10) / 10 : null,
        pct_30d:      pct30d != null ? Math.round(pct30d * 10) / 10 : null,
        last_seen:    today_s?.date || null,
        is_ours:      true,
      };
    });

    // Meta info about history available
    const earliestDate = snaps && snaps.length
      ? snaps.reduce((min, s) => (s.date < min ? s.date : min), today)
      : null;
    const distinctDates = new Set((snaps || []).map((s) => s.date));
    const daysOfHistory = distinctDates.size;

    return Response.json({
      ok: true,
      generated_at: new Date().toISOString(),
      today_ist: today,
      meta: {
        days_of_history: daysOfHistory,
        earliest_snapshot: earliestDate,
        has_7d_history:  daysOfHistory >= 7,
        has_30d_history: daysOfHistory >= 30,
        total_competitors_in_registry: (registry || []).length,
        total_competitor_snapshots_today: competitorRows.filter((r) => r.last_seen === today).length,
      },
      competitors: competitorRows,
      ours:        ourRows,
    });
  } catch (e) {
    console.error('[competitive-intel]', e.message);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
