// app/api/cron/export-sheet/route.js
// Daily export of Supabase data → Google Sheet for team visibility.
// Triggered by Vercel Cron at 04:00 UTC (09:30 IST) — see vercel.json.
// Manual trigger: /api/cron/export-sheet?force=1
//
// v3 — now includes MTProto-enriched fields (views, forwards, reactions, edit_date).
//   • "All Posts" tab columns: Date/Time/Channel/Subject/Type/Preview/Msg ID/Views/Forwards/Reactions/Edited/Deleted/URL
//   • "Channel Performance" tab adds: Avg Views (30d live), Median Views, Top Post URL/Views
//   • NEW tab "Top Posts" — top 100 posts across all channels by views

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

const SB_URL    = process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SA_EMAIL  = process.env.GOOGLE_SHEETS_SA_EMAIL;
const SA_KEY    = process.env.GOOGLE_SHEETS_SA_PRIVATE_KEY;
const SHEET_ID  = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

const CHANNELS = [
  { username:'testbook_ugcnet',         subject:'Common' },
  { username:'pritipaper1',             subject:'Paper 1 · Priti' },
  { username:'tulikamam',               subject:'Paper 1 · Tulika' },
  { username:'Anshikamaamtestbook',     subject:'Paper 1 · Anshika' },
  { username:'testbookrajatsir',        subject:'Paper 1 · Rajat Sir' },
  { username:'pradyumansir_testbook',   subject:'Political Science' },
  { username:'AshwaniSir_Testbook',     subject:'History' },
  { username:'kiranmaamtestbook',       subject:'Public Administration' },
  { username:'Manojsonker_Testbook',    subject:'Sociology' },
  { username:'Heenamaam_testbook',      subject:'Education' },
  { username:'AditiMaam_Testbook',      subject:'Home Science' },
  { username:'karanSir_Testbook',       subject:'Law' },
  { username:'testbookdakshita',        subject:'English' },
  { username:'AshishSir_Testbook',      subject:'Geography' },
  { username:'ShachiMaam_Testbook',     subject:'Economics' },
  { username:'Monikamaamtestbook',      subject:'Management 1' },
  { username:'yogitamaamtestbook',      subject:'Management 2' },
  { username:'EVS_AnshikamaamTestbook', subject:'Environmental Science' },
  { username:'daminimaam_testbook',     subject:'Library Science' },
  { username:'TestbookShahna',          subject:'Computer Science' },
  { username:'Prakashsirtestbook',      subject:'Sanskrit' },
  { username:'kesharisir_testbook',     subject:'Hindi' },
  { username:'TestbookNiharikaMaam',    subject:'Commerce' },
  { username:'MrinaliniMaam_Testbook',  subject:'Psychology' },
  { username:'testbook_gauravsir',      subject:'Physical Education' },
];

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// ── Google service-account auth ──────────────────────────────────────────────
function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function signJwt(saEmail, privateKey, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: saEmail, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 };
  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.createSign('RSA-SHA256').update(signingInput).sign(privateKey);
  return `${signingInput}.${b64url(sig)}`;
}

async function getAccessToken() {
  const privateKey = (SA_KEY || '').replace(/\\n/g, '\n');
  const jwt = signJwt(SA_EMAIL, privateKey, 'https://www.googleapis.com/auth/spreadsheets');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Google auth failed: ' + JSON.stringify(data));
  return data.access_token;
}

// Ensure all 4 tabs exist; create any missing ones via spreadsheets.batchUpdate
async function ensureTabs(token, names) {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?fields=sheets.properties.title`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const meta     = await metaRes.json();
  const existing = new Set((meta.sheets || []).map(s => s.properties.title));
  const missing  = names.filter(n => !existing.has(n));
  if (!missing.length) return;

  const addRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}:batchUpdate`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        requests: missing.map(title => ({ addSheet: { properties: { title } } })),
      }),
    }
  );
  if (!addRes.ok) throw new Error('addSheet failed: ' + (await addRes.text()));
}

async function pushTabs(token, tabs) {
  const clearRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchClear`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ ranges: tabs.map(t => t.range.replace(/!A1$/, '')) }),
    }
  );
  if (!clearRes.ok) throw new Error('batchClear failed: ' + (await clearRes.text()));

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values:batchUpdate`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: tabs.map(t => ({ range: t.range, majorDimension: 'ROWS', values: t.values })),
      }),
    }
  );
  if (!updateRes.ok) throw new Error('batchUpdate failed: ' + (await updateRes.text()));
  return updateRes.json();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtIST(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
}

function reactionsToString(reactions) {
  if (!reactions || typeof reactions !== 'object') return '';
  // Sort by count desc; show top 5 emojis only (rest summed)
  const entries = Object.entries(reactions)
    .filter(([k]) => !k.startsWith('custom:'))            // skip custom emoji (not renderable in sheet)
    .sort((a, b) => (b[1] || 0) - (a[1] || 0));
  if (!entries.length) return '';
  const top  = entries.slice(0, 5).map(([e, c]) => `${e}${c}`).join(' ');
  const rest = entries.slice(5).reduce((s, [, c]) => s + c, 0);
  return rest ? `${top} +${rest}` : top;
}

function reactionsTotal(reactions) {
  if (!reactions || typeof reactions !== 'object') return 0;
  return Object.values(reactions).reduce((s, v) => s + (Number(v) || 0), 0);
}

function tgUrl(username, messageId) {
  if (!username || !messageId) return '';
  return `https://t.me/${username}/${messageId}`;
}

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function isAuthorized(request) {
  const ua = request.headers.get('user-agent') || '';
  const { searchParams } = new URL(request.url);
  return ua.toLowerCase().includes('vercel') || searchParams.get('force') === '1';
}

// ── Main handler ─────────────────────────────────────────────────────────────
export async function GET(request) {
  if (!isAuthorized(request)) return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  if (!sb)                    return Response.json({ ok: false, error: 'supabase_not_configured' });
  if (!SA_EMAIL || !SA_KEY)   return Response.json({ ok: false, error: 'google_sa_not_configured' });
  if (!SHEET_ID)              return Response.json({ ok: false, error: 'sheet_id_not_set' });

  try {
    // 0. Deletion-check probe (non-fatal)
    if (process.env.TELEGRAM_AUDIT_CHAT_ID) {
      try {
        const origin = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
        if (origin) {
          const checkRes  = await fetch(`${origin}/api/cron/check-deletions?force=1&days=2`, { cache: 'no-store' });
          const checkData = await checkRes.json();
          console.log('[export-sheet] deletion-check result:', JSON.stringify(checkData));
        }
      } catch (e) {
        console.error('[export-sheet] deletion-check failed (non-fatal):', e.message);
      }
    }

    // 1. Pull data — last 30 days for "All Posts" view, plus snapshot history
    const sinceIso = new Date(Date.now() - 30 * 86400000).toISOString();
    const [recentPostsRes, topPostsRes, snapsRes] = await Promise.all([
      sb.from('tg_posts')
        .select('chat_username, posted_at, post_type, preview, message_id, deleted_at, views, forwards, reactions, edit_date')
        .gte('posted_at', sinceIso)
        .order('posted_at', { ascending: false })
        .limit(5000),
      // For Top Posts: all-time top 100 by views, excluding deleted, excluding null views
      sb.from('tg_posts')
        .select('chat_username, posted_at, post_type, preview, message_id, views, forwards, reactions')
        .is('deleted_at', null)
        .not('views', 'is', null)
        .order('views', { ascending: false })
        .limit(100),
      sb.from('tg_subscriber_snapshots')
        .select('chat_username, snapshot_date, subscribers')
        .order('snapshot_date', { ascending: false }),
    ]);

    if (recentPostsRes.error) throw new Error('recent posts read: ' + recentPostsRes.error.message);
    if (topPostsRes.error)    throw new Error('top posts read: '    + topPostsRes.error.message);
    if (snapsRes.error)       throw new Error('snapshots read: '    + snapsRes.error.message);

    const posts    = recentPostsRes.data || [];
    const topPosts = topPostsRes.data    || [];
    const snaps    = snapsRes.data       || [];

    // 2. Daily Snapshot tab — unchanged
    const snapByDate = {};
    for (const r of snaps) {
      if (!snapByDate[r.snapshot_date]) snapByDate[r.snapshot_date] = {};
      snapByDate[r.snapshot_date][(r.chat_username || '').toLowerCase()] = r.subscribers;
    }
    const dates      = Object.keys(snapByDate).sort().reverse();
    const snapHeader = ['Date (IST)', ...CHANNELS.map(c => c.subject), 'Total'];
    const snapRows   = dates.map(d => {
      const row = [d];
      let total = 0;
      for (const c of CHANNELS) {
        const v = snapByDate[d][c.username.toLowerCase()];
        row.push(typeof v === 'number' ? v : '');
        if (typeof v === 'number') total += v;
      }
      row.push(total);
      return row;
    });

    // 3. All Posts tab — enriched with views/forwards/reactions/edited/url
    const postHeader = [
      'Date (IST)', 'Time (IST)', 'Channel', 'Subject', 'Type', 'Preview',
      'Msg ID', 'Views', 'Forwards', 'Reactions', 'Reactions Total',
      'Edited (IST)', 'Deleted (IST)', 'URL',
    ];
    const postRows = posts.map(p => {
      const ts   = new Date(p.posted_at);
      const date = ts.toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' });
      const time = ts.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
      const ch   = CHANNELS.find(c => c.username.toLowerCase() === (p.chat_username || '').toLowerCase());
      return [
        date,
        time,
        '@' + (p.chat_username || ''),
        ch?.subject || '',
        p.post_type,
        p.preview,
        p.message_id,
        p.views ?? '',
        p.forwards ?? '',
        reactionsToString(p.reactions),
        reactionsTotal(p.reactions) || '',
        fmtIST(p.edit_date),
        fmtIST(p.deleted_at),
        tgUrl(p.chat_username, p.message_id),
      ];
    });

    // 4. Channel Performance — enriched with engagement metrics
    const latestSnap = snapByDate[dates[0]] || {};
    const last7dIso  = new Date(Date.now() -  7 * 86400000).toISOString();
    const last30dIso = new Date(Date.now() - 30 * 86400000).toISOString();
    const byChannel  = {};      // username → { posts7d, posts30d, lastPostAt, views30d:[], topPost }

    for (const p of posts) {
      if (p.deleted_at) continue;
      const u = (p.chat_username || '').toLowerCase();
      if (!byChannel[u]) byChannel[u] = { posts7d: 0, posts30d: 0, lastPostAt: null, views30d: [], topPost: null };
      const ch = byChannel[u];
      if (p.posted_at >= last30dIso) ch.posts30d++;
      if (p.posted_at >= last7dIso)  ch.posts7d++;
      if (!ch.lastPostAt || p.posted_at > ch.lastPostAt) ch.lastPostAt = p.posted_at;
      if (typeof p.views === 'number') {
        if (p.posted_at >= last30dIso) ch.views30d.push(p.views);
        if (!ch.topPost || p.views > (ch.topPost.views || 0)) {
          ch.topPost = { views: p.views, url: tgUrl(p.chat_username, p.message_id) };
        }
      }
    }

    const perfHeader = [
      'Channel', 'Subject', 'Subscribers',
      'Posts (7d, live)', 'Posts (30d, live)',
      'Avg Views (30d)', 'Median Views (30d)',
      'Top Post Views', 'Top Post URL',
      'Last Post (IST)',
    ];
    const perfRows = CHANNELS.map(c => {
      const u    = c.username.toLowerCase();
      const ch   = byChannel[u] || { posts7d: 0, posts30d: 0, lastPostAt: null, views30d: [], topPost: null };
      const avg  = ch.views30d.length ? Math.round(ch.views30d.reduce((a, b) => a + b, 0) / ch.views30d.length) : '';
      const med  = ch.views30d.length ? median(ch.views30d) : '';
      return [
        '@' + c.username,
        c.subject,
        latestSnap[u] ?? '',
        ch.posts7d,
        ch.posts30d,
        avg,
        med,
        ch.topPost?.views ?? '',
        ch.topPost?.url   ?? '',
        ch.lastPostAt ? fmtIST(ch.lastPostAt) : '',
      ];
    }).sort((a, b) => (Number(b[2]) || 0) - (Number(a[2]) || 0));

    // 5. NEW: Top Posts tab — top 100 by views, all-time, live posts only
    const topHeader = ['Rank', 'Date (IST)', 'Channel', 'Subject', 'Type', 'Preview', 'Views', 'Forwards', 'Reactions', 'URL'];
    const topRows = topPosts.map((p, i) => {
      const ch = CHANNELS.find(c => c.username.toLowerCase() === (p.chat_username || '').toLowerCase());
      return [
        i + 1,
        new Date(p.posted_at).toLocaleDateString('sv-SE', { timeZone: 'Asia/Kolkata' }),
        '@' + (p.chat_username || ''),
        ch?.subject || '',
        p.post_type,
        (p.preview || '').slice(0, 100),
        p.views ?? '',
        p.forwards ?? '',
        reactionsToString(p.reactions),
        tgUrl(p.chat_username, p.message_id),
      ];
    });

    // 6. Push to Sheets — ensure tabs exist first
    const token = await getAccessToken();
    await ensureTabs(token, ['Daily Snapshot', 'All Posts', 'Channel Performance', 'Top Posts']);
    await pushTabs(token, [
      { range: "'Daily Snapshot'!A1",      values: [snapHeader, ...snapRows] },
      { range: "'All Posts'!A1",           values: [postHeader, ...postRows] },
      { range: "'Channel Performance'!A1", values: [perfHeader, ...perfRows] },
      { range: "'Top Posts'!A1",           values: [topHeader,  ...topRows]  },
    ]);

    const deletedCount = posts.filter(p => p.deleted_at).length;
    const withViews    = posts.filter(p => typeof p.views === 'number').length;

    return Response.json({
      ok:               true,
      exportedAt:       new Date().toISOString(),
      snapshotDays:     dates.length,
      postsExported:    postRows.length,
      postsWithViews:   withViews,
      deletedPosts:     deletedCount,
      topPostsExported: topRows.length,
      channelsTracked:  CHANNELS.length,
      sheetUrl:         `https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
    });
  } catch (e) {
    console.error('[cron/export-sheet]', e.message);
    return Response.json({ ok: false, error: e.message });
  }
}
