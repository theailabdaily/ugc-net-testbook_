// app/api/scheduled-posts/[id]/route.js
// PATCH  body { field: value }   → edit fields (scheduled_at, content, should_pin, post_type, …)
// DELETE                          → soft-cancel (status=cancelled) + delete from TG if already posted
// POST   body { action }
//   action='post-now'    → immediately post to Telegram, update status
//   action='pin'         → pin existing posted message
//   action='unpin'       → unpin
//   action='delete-tg'   → delete from Telegram (keep DB row, set status=cancelled)

import { createClient } from '@supabase/supabase-js';

export const dynamic     = 'force-dynamic';
export const runtime     = 'nodejs';
export const maxDuration = 30;

const SB_URL    = process.env.SUPABASE_URL;
const SB_KEY    = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

// ─── Telegram posting helpers ───
async function tgSend(post) {
  const chatId = '@' + post.chat_username.replace(/^@/, '');

  if (post.post_type === 'MCQ' && post.quiz_question && Array.isArray(post.quiz_options)) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        question: post.quiz_question.slice(0, 255),
        options: post.quiz_options.map((o) => ({ text: String(o).slice(0, 100) })),
        type: 'quiz',
        correct_option_id: Number(post.quiz_correct_idx ?? 0),
        explanation: (post.quiz_explanation || '').slice(0, 200),
        is_anonymous: true,
      }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'sendPoll failed');
    return data.result.message_id;
  }

  if (post.image_url) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: post.image_url, caption: (post.content || '').slice(0, 1024), parse_mode: 'HTML' }),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.description || 'sendPhoto failed');
    return data.result.message_id;
  }

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: (post.content || '').slice(0, 4096), parse_mode: 'HTML' }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'sendMessage failed');
  return data.result.message_id;
}

async function tgPin(chat_username, message_id) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/pinChatMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: '@' + chat_username.replace(/^@/, ''), message_id, disable_notification: true }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'pin failed');
}

async function tgUnpin(chat_username, message_id) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/unpinChatMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: '@' + chat_username.replace(/^@/, ''), message_id }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'unpin failed');
}

async function tgDelete(chat_username, message_id) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: '@' + chat_username.replace(/^@/, ''), message_id }),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(data.description || 'delete failed');
}

// ─── Handlers ───
export async function PATCH(request, { params }) {
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  const { id } = params;
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  // Allow-list of editable fields
  const allowed = ['scheduled_at', 'post_type', 'content', 'quiz_question', 'quiz_options', 'quiz_correct_idx', 'quiz_explanation', 'image_url', 'should_pin', 'chat_username'];
  const patch = {};
  for (const k of allowed) if (k in body) patch[k] = body[k];
  if (patch.chat_username) patch.chat_username = patch.chat_username.toLowerCase();

  try {
    const { data, error } = await sb.from('tg_scheduled_posts')
      .update(patch).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, post: data });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  const { id } = params;
  try {
    const { data: existing } = await sb.from('tg_scheduled_posts').select('*').eq('id', id).single();

    // If already posted, try deleting from TG (best-effort)
    if (existing?.status === 'posted' && existing.telegram_message_id) {
      try { await tgDelete(existing.chat_username, existing.telegram_message_id); }
      catch (e) { console.warn('[delete] tgDelete failed:', e.message); }
    }

    const { error } = await sb.from('tg_scheduled_posts')
      .update({ status: 'cancelled' }).eq('id', id);
    if (error) throw new Error(error.message);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  if (!BOT_TOKEN) return Response.json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
  const { id } = params;
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }
  const { action } = body;

  try {
    const { data: post, error: fetchErr } = await sb.from('tg_scheduled_posts').select('*').eq('id', id).single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (!post) return Response.json({ ok: false, error: 'not_found' }, { status: 404 });

    if (action === 'post-now') {
      if (post.status === 'posted') return Response.json({ ok: false, error: 'already_posted' }, { status: 400 });
      await sb.from('tg_scheduled_posts').update({ status: 'posting' }).eq('id', id);
      try {
        const msgId = await tgSend(post);
        if (post.should_pin) {
          try { await tgPin(post.chat_username, msgId); }
          catch (e) { console.warn('[post-now] pin failed:', e.message); }
        }
        await sb.from('tg_scheduled_posts').update({
          status: 'posted',
          telegram_message_id: msgId,
          posted_at: new Date().toISOString(),
          error_message: null,
        }).eq('id', id);
        return Response.json({ ok: true, message_id: msgId });
      } catch (e) {
        await sb.from('tg_scheduled_posts').update({
          status: 'failed',
          error_message: e.message,
          retry_count: (post.retry_count || 0) + 1,
        }).eq('id', id);
        return Response.json({ ok: false, error: e.message }, { status: 500 });
      }
    }

    if (action === 'pin') {
      if (!post.telegram_message_id) return Response.json({ ok: false, error: 'not_posted_yet' }, { status: 400 });
      await tgPin(post.chat_username, post.telegram_message_id);
      await sb.from('tg_scheduled_posts').update({ should_pin: true }).eq('id', id);
      return Response.json({ ok: true });
    }

    if (action === 'unpin') {
      if (!post.telegram_message_id) return Response.json({ ok: false, error: 'not_posted_yet' }, { status: 400 });
      await tgUnpin(post.chat_username, post.telegram_message_id);
      await sb.from('tg_scheduled_posts').update({ should_pin: false }).eq('id', id);
      return Response.json({ ok: true });
    }

    if (action === 'delete-tg') {
      if (!post.telegram_message_id) return Response.json({ ok: false, error: 'not_posted_yet' }, { status: 400 });
      await tgDelete(post.chat_username, post.telegram_message_id);
      await sb.from('tg_scheduled_posts').update({ status: 'cancelled' }).eq('id', id);
      return Response.json({ ok: true });
    }

    return Response.json({ ok: false, error: 'unknown_action' }, { status: 400 });
  } catch (e) {
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
