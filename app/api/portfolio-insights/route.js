// app/api/portfolio-insights/route.js
// AI-generated executive briefing + recommended actions for portfolio leadership view.
// POST body: { current: {channels}, prior: {channels|null}, topPosts: [], range: { from, to, preset }, subjectsLabel? }

export const dynamic     = 'force-dynamic';
export const runtime     = 'nodejs';
export const maxDuration = 30;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SUBJECT_MAP = {
  testbook_ugcnet: 'Common',
  pritipaper1: 'Paper 1 · Priti', tulikamam: 'Paper 1 · Tulika',
  anshikamaamtestbook: 'Paper 1 · Anshika', testbookrajatsir: 'Paper 1 · Rajat Sir',
  pradyumansir_testbook: 'Political Science', ashwanisir_testbook: 'History',
  kiranmaamtestbook: 'Public Administration', manojsonker_testbook: 'Sociology',
  heenamaam_testbook: 'Education', aditimaam_testbook: 'Home Science',
  karansir_testbook: 'Law', testbookdakshita: 'English',
  ashishsir_testbook: 'Geography', shachimaam_testbook: 'Economics',
  monikamaamtestbook: 'Management 1', yogitamaamtestbook: 'Management 2',
  evs_anshikamaamtestbook: 'Environmental Science', daminimaam_testbook: 'Library Science',
  testbookshahna: 'Computer Science', prakashsirtestbook: 'Sanskrit',
  kesharisir_testbook: 'Hindi', testbookniharikamaam: 'Commerce',
  mrinalinimaam_testbook: 'Psychology', testbook_gauravsir: 'Physical Education',
};

function aggregate(channels) {
  if (!channels || channels.length === 0) return null;
  let subs=0, joined=0, lost=0, posts=0, views=0, forwards=0, reactions=0;
  let withEng = 0, engSum = 0, withNotif = 0, notifSum = 0;
  for (const c of channels) {
    subs     += c.subscribers || 0;
    joined   += c.subsGained || 0;
    lost     += c.subsLost || 0;
    posts    += c.posts || 0;
    views    += c.totalViews || 0;
    forwards += c.totalForwards || 0;
    reactions += c.totalReactions || 0;
    if (c.engagementRate !== null && c.engagementRate !== undefined) {
      withEng += 1; engSum += c.engagementRate;
    }
    if (c.notifPct !== null && c.notifPct !== undefined) {
      withNotif += 1; notifSum += c.notifPct;
    }
  }
  return {
    subs, joined, lost, net: joined - lost,
    posts, views, forwards, reactions,
    avgEng: withEng ? engSum / withEng : null,
    avgNotif: withNotif ? notifSum / withNotif : null,
  };
}

function ppDelta(curr, prev) {
  if (curr === null || curr === undefined || prev === null || prev === undefined || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

export async function POST(request) {
  if (!ANTHROPIC_API_KEY) return Response.json({ ok: false, error: 'anthropic_key_not_set' }, { status: 500 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'bad_json' }, { status: 400 }); }
  const { current, prior, topPosts = [], range = {}, subjectsLabel = 'All subjects' } = body;
  if (!current?.channels?.length) {
    return Response.json({ ok: false, error: 'no_channels' }, { status: 400 });
  }

  const aggCurr = aggregate(current.channels);
  const aggPrev = prior?.channels ? aggregate(prior.channels) : null;

  // Per-channel movers — descending by net follower change
  const sortedByNet = [...current.channels]
    .filter((c) => c.subsNet !== null && c.subsNet !== undefined)
    .sort((a, b) => (b.subsNet || 0) - (a.subsNet || 0));
  const topGainers = sortedByNet.slice(0, 5).map((c) => ({
    username: c.username, subject: SUBJECT_MAP[c.username] || c.username,
    subs: c.subscribers, joined: c.subsGained, left: c.subsLost, net: c.subsNet,
    engagementRate: c.engagementRate?.toFixed?.(2), notifPct: c.notifPct?.toFixed?.(1),
  }));
  const topLosers = sortedByNet.slice(-5).reverse().map((c) => ({
    username: c.username, subject: SUBJECT_MAP[c.username] || c.username,
    subs: c.subscribers, joined: c.subsGained, left: c.subsLost, net: c.subsNet,
  }));

  const topPostsCompact = topPosts.slice(0, 5).map((p) => ({
    channel: p.chatUsername, subject: SUBJECT_MAP[p.chatUsername] || p.chatUsername,
    views: p.views, forwards: p.forwards, postType: p.postType,
    preview: p.preview?.slice(0, 100),
  }));

  const rangeLabel = range.preset || `${range.from} → ${range.to}`;

  const prompt = `You are an analyst writing an executive briefing on Testbook's UGC NET Telegram channel network for Mohit Mundhara, the UGC NET category head. This briefing will be screenshotted and shared with leadership. Mohit's tone preference: confident, factual, no fluff.

Network context: 25 channels — Common (testbook_ugcnet), 4 Paper 1 faculty channels, and 20 subject-specific channels covering UGC NET.

Period analyzed: ${rangeLabel}
Filter applied: ${subjectsLabel}

PORTFOLIO METRICS (current vs prior comparable period):

Current period (${current.from?.slice(0,10)} → ${current.to?.slice(0,10)}):
${JSON.stringify(aggCurr, null, 2)}

Prior period (${prior?.from?.slice(0,10) || 'n/a'} → ${prior?.to?.slice(0,10) || 'n/a'}):
${aggPrev ? JSON.stringify(aggPrev, null, 2) : 'No prior period available (range is too old or all-time)'}

Period-over-period changes:
${aggPrev ? `
- Net subs gained: ${aggCurr.net} (prior ${aggPrev.net}, ${ppDelta(aggCurr.net, aggPrev.net)?.toFixed(0)}%)
- Joined: ${aggCurr.joined} vs ${aggPrev.joined} (${ppDelta(aggCurr.joined, aggPrev.joined)?.toFixed(0)}%)
- Left:   ${aggCurr.lost} vs ${aggPrev.lost} (${ppDelta(aggCurr.lost, aggPrev.lost)?.toFixed(0)}%)
- Posts:  ${aggCurr.posts} vs ${aggPrev.posts} (${ppDelta(aggCurr.posts, aggPrev.posts)?.toFixed(0)}%)
- Views:  ${aggCurr.views} vs ${aggPrev.views} (${ppDelta(aggCurr.views, aggPrev.views)?.toFixed(0)}%)
- Avg Engagement %: ${aggCurr.avgEng?.toFixed(2)} vs ${aggPrev.avgEng?.toFixed(2)}
` : 'N/A'}

Top 5 gainers (this period):
${JSON.stringify(topGainers, null, 2)}

Bottom 5 (lowest net growth, may be losses):
${JSON.stringify(topLosers, null, 2)}

Top 5 individual posts (this period):
${JSON.stringify(topPostsCompact, null, 2)}

TASK: Write an executive briefing (3-5 sentences) and 3-5 recommended actions.

Briefing requirements:
- Sentence 1: Overall portfolio health (growing/flat/declining) with the headline number
- Sentence 2: Biggest win or driver of growth — name the channel
- Sentence 3: Biggest concern or risk — name the channel
- Sentence 4 (optional): Notable trend or pattern
- Sentence 5 (optional): One-line "what this means for next period"
- Tone: confident, specific, no hedging, no "consider" or "might want to"
- ALWAYS cite specific numbers and channel names

Recommended actions requirements:
- 3-5 actions, prioritized
- Each action is specific, doable this week, with concrete channels/numbers
- NOT generic advice like "improve engagement" — actions like "audit pradyumansir's posting cadence — 40% mute rate suggests over-posting"

OUTPUT FORMAT — return ONLY valid JSON, no preamble:
{
  "briefing": "3-5 sentence executive briefing as a single string",
  "actions": [
    {
      "priority": "high" | "medium" | "low",
      "text": "specific actionable recommendation",
      "channels": ["channel_username"]
    }
  ]
}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages:   [{ role: 'user', content: prompt }],
      }),
    });
    const data = await r.json();
    if (!r.ok) return Response.json({ ok: false, error: data?.error?.message || 'claude_api_error' }, { status: 500 });

    const text = data.content?.find((b) => b.type === 'text')?.text || '';
    const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
    }
    if (!parsed?.briefing) {
      return Response.json({ ok: false, error: 'invalid_format', raw: cleaned.slice(0, 400) }, { status: 500 });
    }

    return Response.json({
      ok: true,
      briefing:     parsed.briefing,
      actions:      Array.isArray(parsed.actions) ? parsed.actions : [],
      aggregates:   { current: aggCurr, prior: aggPrev },
      generatedAt:  new Date().toISOString(),
      range:        rangeLabel,
    });
  } catch (e) {
    console.error('[portfolio-insights]', e.message);
    return Response.json({ ok: false, error: e.message }, { status: 500 });
  }
}
