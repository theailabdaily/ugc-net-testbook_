// app/api/snapshots/route.js
// Returns recent subscriber snapshots from Supabase for delta calculations.
// Replaces localStorage-only snapshots (which died on browser/device switches).
// Default: last 30 days. Override with ?days=N.

import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export async function GET(request) {
  if (!sb) {
    return Response.json({ success: false, error: 'supabase_not_configured' });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.max(1, Math.min(90, parseInt(searchParams.get('days') || '30', 10)));

  // Cutoff date in IST (snapshot_date is a DATE column)
  const cutoff = new Date(Date.now() - days * 86400000)
    .toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });

  const { data, error } = await sb
    .from('tg_subscriber_snapshots')
    .select('chat_username, snapshot_date, subscribers')
    .gte('snapshot_date', cutoff)
    .order('snapshot_date', { ascending: false });

  if (error) {
    console.error('[snapshots] read failed:', error.message);
    return Response.json({ success: false, error: error.message });
  }

  // Shape: { date: { username: subscribers } } — same shape as old localStorage
  const byDate = {};
  for (const row of data || []) {
    const d = row.snapshot_date;
    const u = (row.chat_username || '').toLowerCase();
    if (!d || !u) continue;
    if (!byDate[d]) byDate[d] = {};
    byDate[d][u] = row.subscribers;
  }

  return Response.json({
    success:  true,
    snapshots: byDate,
    rangeDays: days,
    rows:     data?.length || 0,
    dates:    Object.keys(byDate).sort().reverse(),
    source:   'supabase',
  });
}
