import Anthropic from '@anthropic-ai/sdk';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') return await generateDayPlan(body);
    if (action === 'post')     return await postToTelegram(body);
    if (action === 'delete')   return await deleteFromTelegram(body);

    return Response.json({ success: false, error: 'Unknown action: ' + action });
  } catch (e) {
    console.error('[calendar] top-level error:', e.message);
    return Response.json({ success: false, error: e.message });
  }
}

// ─── Generate Day Plan ──────────────────────────────────────────────────────

async function generateDayPlan({ channelUsername, channelTitle, subject, contentTypes, subscribers, bestHours, date }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ success: false, error: 'ANTHROPIC_API_KEY not set in Vercel environment variables' });
  }

  const anthropic = new Anthropic({ apiKey });

  const hours = (bestHours && bestHours.length) ? bestHours.join(', ') : '8:00 AM, 12:00 PM, 6:00 PM, 8:30 PM';

  const contentMix = (contentTypes && contentTypes.length)
    ? contentTypes.map(ct => `${ct.type} (avg ${ct.avgViews} views, ${ct.rate}% rate)`).join('; ')
    : 'Quiz/Poll, YouTube Class Link, PDF Notes, PYQ Discussion, Current Affairs';

  const subsFormatted = (subscribers || 0).toLocaleString('en-IN');

  const prompt = `You are an expert Telegram content strategist for UGC NET exam preparation at Testbook.
Generate a full posting plan for ONE day for this channel:

Channel: @${channelUsername} (${channelTitle || subject})
Subject: ${subject}
Subscribers: ${subsFormatted}
Best posting hours: ${hours}
Content types that perform well: ${contentMix}
Date: ${date}

Generate exactly 5 posts that are READY TO SEND on Telegram — not templates, actual complete posts.

Return ONLY a valid JSON object with this exact structure (no markdown fences, no extra text):

{
  "posts": [
    {
      "id": "p1",
      "time": "8:00 AM",
      "type": "MCQ",
      "pin": false,
      "question": "Which of the following statements about [specific UGC NET ${subject} topic] is CORRECT?",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correct_option_id": 0,
      "explanation": "Option A is correct because [specific reason relevant to ${subject}]",
      "rationale": "Morning MCQ drives early engagement and reinforces yesterday's concept"
    },
    {
      "id": "p2",
      "time": "12:00 PM",
      "type": "Current Affairs",
      "pin": false,
      "text": "📰 <b>Daily Current Affairs — ${subject}</b>\\n\\n[Write 3-5 specific, real current affairs bullet points relevant to UGC NET ${subject}]\\n\\n📚 Share with your friends!\\n@${channelUsername}",
      "rationale": "Afternoon CA keeps students engaged during lunch break"
    },
    {
      "id": "p3",
      "time": "4:00 PM",
      "type": "PDF Notes",
      "pin": false,
      "text": "📄 <b>[Specific Topic Name] — Quick Notes</b>\\n\\n[Write 5-8 actual important points about a specific ${subject} topic for UGC NET]\\n\\n💡 Save this for quick revision!\\n@${channelUsername}",
      "rationale": "Afternoon study time — concise notes perform best"
    },
    {
      "id": "p4",
      "time": "6:30 PM",
      "type": "PYQ Discussion",
      "pin": false,
      "text": "📝 <b>PYQ Discussion — ${subject}</b>\\n\\n[Write an actual previous year question from UGC NET ${subject} with detailed explanation]\\n\\n🎯 Practise PYQs daily!\\n@${channelUsername}",
      "rationale": "Evening PYQ practice is most popular — students revise before bed"
    },
    {
      "id": "p5",
      "time": "8:30 PM",
      "type": "YouTube Class Link",
      "pin": true,
      "text": "▶️ <b>Tonight's Live Class — ${subject}</b>\\n\\n📌 Topic: [Specific topic for tonight]\\n⏰ Time: 8:30 PM IST\\n\\n🔴 Join now on Testbook App!\\n📲 testbook.com/ugc-net-coaching\\n\\n@${channelUsername}",
      "rationale": "Evening class announcement pinned for maximum visibility"
    }
  ]
}

Rules:
- All text MUST be specific to UGC NET ${subject} — use real topics, actual concepts, real PYQ themes
- Telegram HTML: use <b> for bold only — no <i>, no <a> tags
- Newlines in JSON strings must be \\n (escaped)
- "pin": true only for the most important post of the day
- correct_option_id is 0-indexed (0=A, 1=B, 2=C, 3=D)
- Return ONLY the JSON object`;

  let raw;
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      messages: [{ role: 'user', content: prompt }]
    });
    raw = response.content[0].text.trim();
  } catch (e) {
    console.error('[calendar generate] Anthropic API error:', e.message);
    return Response.json({ success: false, error: 'AI error: ' + e.message });
  }

  try {
    // Strip any accidental markdown fences
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const parsed = JSON.parse(clean);
    if (!parsed.posts || !Array.isArray(parsed.posts)) {
      throw new Error('Response missing posts array');
    }
    return Response.json({ success: true, posts: parsed.posts });
  } catch (e) {
    console.error('[calendar generate] JSON parse error:', e.message, '\nRaw:', raw.slice(0, 300));
    return Response.json({ success: false, error: 'Failed to parse AI response. Please retry.' });
  }
}

// ─── Post to Telegram ───────────────────────────────────────────────────────

async function postToTelegram({ channelUsernames, text, imageUrl, pin, type, question, options, correct_option_id, explanation }) {
  if (!BOT_TOKEN) {
    return Response.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not set in Vercel environment variables' });
  }

  const results = await Promise.all(
    (channelUsernames || []).map(async (username) => {
      const chatId = '@' + username.replace(/^@/, '');
      try {
        let msgId;

        if (type === 'MCQ' && question && options && options.length) {
          // Send as Telegram quiz poll
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPoll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              question: question.slice(0, 255),  // Telegram limit
              options: options.map(o => ({ text: String(o).slice(0, 100) })),
              type: 'quiz',
              correct_option_id: Number(correct_option_id ?? 0),
              explanation: (explanation || '').slice(0, 200),
              is_anonymous: true
            })
          });
          const data = await res.json();
          if (!data.ok) return { channel: username, success: false, error: data.description };
          msgId = data.result.message_id;

        } else if (imageUrl) {
          // Send photo with caption
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              photo: imageUrl,
              caption: (text || '').slice(0, 1024),
              parse_mode: 'HTML'
            })
          });
          const data = await res.json();
          if (!data.ok) return { channel: username, success: false, error: data.description };
          msgId = data.result.message_id;

        } else {
          // Send text message
          const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              text: (text || '').slice(0, 4096),
              parse_mode: 'HTML'
            })
          });
          const data = await res.json();
          if (!data.ok) return { channel: username, success: false, error: data.description };
          msgId = data.result.message_id;
        }

        // Pin if requested
        let pinned = false;
        if (pin && msgId) {
          const pinRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/pinChatMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, message_id: msgId, disable_notification: true })
          });
          const pinData = await pinRes.json();
          pinned = pinData.ok;
        }

        return { channel: username, success: true, messageId: msgId, pinned };
      } catch (e) {
        return { channel: username, success: false, error: e.message };
      }
    })
  );

  return Response.json({ success: true, results });
}

// ─── Delete from Telegram ───────────────────────────────────────────────────

async function deleteFromTelegram({ channelUsername, messageId }) {
  if (!BOT_TOKEN) {
    return Response.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' });
  }

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: '@' + (channelUsername || '').replace(/^@/, ''),
      message_id: messageId
    })
  });
  const data = await res.json();

  return Response.json({ success: data.ok, error: data.description });
}
