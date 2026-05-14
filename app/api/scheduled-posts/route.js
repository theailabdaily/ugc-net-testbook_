// app/api/scheduled-posts/route.js
// GET  ?from=&to=&channel=  → list scheduled posts in range, optionally filtered by channel
// POST { chat_username, scheduled_at, post_type, content, ... }  → create scheduled post

import { createClient } from '@supabase/supabase-js';

export const dynamic     = 'force-dynamic';
export const runtime     = 'nodejs';
export const maxDuration = 15;

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = (SB_URL && SB_KEY)
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  : null;

export async function GET(request) {
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const from    = searchParams.get('from');
  const to      = searchParams.get('to');
  const channel = searchParams.get('channel');
  if (!from || !to) return Response.json({ ok: false, error: 'missing_from_or_to' }, { status: 400 });

  try {
    let q = sb.from('tg_scheduled_posts')
      .select('*')
      .gte('scheduled_at', from)
      .lte('scheduled_at', to)
      .neq('status', 'cancelled')
      .order('scheduled_at', { ascending: true })
      .limit(2000);
    if (channel) q = q.eq('chat_username', channel.toLowerCase());
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, posts: data || [] });
  } catch (e) {
    console.error('[scheduled-posts GET]', e.message);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}

export async function POST(request) {
  if (!sb) return Response.json({ ok: false, error: 'supabase_not_configured' }, { status: 500 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  const {
    chat_username, scheduled_at,
    post_type = 'Message',
    content = '',
    quiz_question, quiz_options, quiz_correct_idx, quiz_explanation,
    image_url,
    should_pin = false,
    source = 'manual',
    created_by,
  } = body;

  if (!chat_username || !scheduled_at) {
    return Response.json({ ok: false, error: 'chat_username and scheduled_at are required' }, { status: 400 });
  }
  if (post_type === 'MCQ' && (!quiz_question || !Array.isArray(quiz_options) || quiz_options.length < 2)) {
    return Response.json({ ok: false, error: 'MCQ requires quiz_question + ≥2 quiz_options' }, { status: 400 });
  }

  try {
    const { data, error } = await sb.from('tg_scheduled_posts')
      .insert({
        chat_username:    chat_username.toLowerCase(),
        scheduled_at,
        post_type,
        content,
        quiz_question:    quiz_question || null,
        quiz_options:     quiz_options || null,
        quiz_correct_idx: (quiz_correct_idx === null || quiz_correct_idx === undefined) ? null : Number(quiz_correct_idx),
        quiz_explanation: quiz_explanation || null,
        image_url:        image_url || null,
        should_pin:       !!should_pin,
        source,
        created_by:       created_by || null,
        status:           'scheduled',
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return Response.json({ ok: true, post: data });
  } catch (e) {
    console.error('[scheduled-posts POST]', e.message);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
