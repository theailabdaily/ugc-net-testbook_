export const dynamic = 'force-dynamic';

const BOT = process.env.TELEGRAM_BOT_TOKEN;

async function tg(endpoint, payload) {
  const res = await fetch(`https://api.telegram.org/bot${BOT}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

function botError(desc) {
  if (!desc) return 'Telegram API error';
  if (desc.includes('bot is not a member') || desc.includes('chat not found'))
    return 'Bot is not in this channel. Add it as admin first.';
  if (desc.includes('not enough rights'))
    return 'Bot needs admin rights with Post Messages permission.';
  if (desc.includes('message to delete not found'))
    return 'Message already deleted or not found.';
  return desc;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate') {
      const { channelUsername, channelTitle, subject, contentTypes, subscribers, bestHours, date } = body;
      const dateStr = new Date(date + 'T12:00:00').toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      });
      const topTypes = (contentTypes || []).map(c => c.type).join(', ') || 'MCQ, PDF Notes, YouTube Class Link';

      const prompt = `You are a Telegram content manager for Testbook UGC NET.

Generate a complete day plan for:
Channel: ${channelTitle} (@${channelUsername})
Subject: ${subject}
Subscribers: ${Number(subscribers || 0).toLocaleString('en-IN')}
Date: ${dateStr}
Best Hours: ${(bestHours || ['8:00am','12:00pm','6:00pm','8:00pm']).join(', ')}
Content mix: ${topTypes}

Return ONLY a JSON array (no markdown, no code fences).

For non-MCQ posts use:
{"time":"7:00 AM","type":"Current Affairs","emoji":"📰","text":"Telegram-ready message with HTML bold tags, emojis, real ${subject} content for UGC NET. Max 350 chars.","pin":false,"rationale":"why this slot"}

For MCQ posts use THIS EXACT structure:
{"time":"8:00 AM","type":"MCQ","emoji":"🧪","question":"Full question text for UGC NET ${subject} max 255 chars","options":["Option A","Option B","Option C","Option D"],"correct_option_id":2,"explanation":"Brief explanation max 180 chars","pin":false,"rationale":"why MCQ at this time"}

Rules:
- Generate 5-7 posts spread across the day
- Types: MCQ, PDF Notes, YouTube Class Link, Voice Note Class, PYQ Discussion, Current Affairs, Promotional Post
- Include 2-3 MCQ posts using the EXACT MCQ structure with question/options/correct_option_id/explanation
- Write REAL ${subject} UGC NET content
- Pin exactly ONE post
- HTML only in text field: only b and i tags
- MCQ options: 4 strings max 100 chars each
- correct_option_id is 0-indexed integer`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      if (!res.ok) return Response.json({ success: false, error: data?.error?.message || 'Claude error' }, { status: 500 });

      const raw = data.content?.find(b => b.type === 'text')?.text || '';
      const clean = raw.replace(/```json|```/g, '').trim();
      const posts = JSON.parse(clean);
      const tagged = posts.map((p, i) => ({ ...p, id: `post_${Date.now()}_${i}`, status: 'pending' }));
      return Response.json({ success: true, posts: tagged });
    }

    if (action === 'post') {
      if (!BOT) return Response.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });

      const { channelUsernames, channelUsername, text, pin, type, question, options, correct_option_id, explanation, imageUrl } = body;
      const targets = channelUsernames || (channelUsername ? [channelUsername] : []);
      if (!targets.length) return Response.json({ success: false, error: 'No channels specified' }, { status: 400 });

      const results = [];
      for (const username of targets) {
        let sendData;
        try {
          if (type === 'MCQ' && question && Array.isArray(options) && options.length === 4) {
            sendData = await tg('sendPoll', {
              chat_id: `@${username}`,
              question: question.slice(0, 255),
              options: options.map(o => String(o).slice(0, 100)),
              type: 'quiz',
              correct_option_id: Number(correct_option_id) || 0,
              explanation: (explanation || '').slice(0, 200),
              is_anonymous: true,
            });
          } else if (imageUrl) {
            sendData = await tg('sendPhoto', {
              chat_id: `@${username}`,
              photo: imageUrl,
              caption: (text || '').slice(0, 1024),
              parse_mode: 'HTML',
            });
          } else {
            sendData = await tg('sendMessage', {
              chat_id: `@${username}`,
              text: text || '',
              parse_mode: 'HTML',
              disable_web_page_preview: false,
            });
          }

          if (!sendData.ok) {
            results.push({ channel: username, success: false, error: botError(sendData.description) });
            continue;
          }

          const messageId = sendData.result.message_id;
          let pinned = false;
          if (pin && messageId) {
            const pinData = await tg('pinChatMessage', {
              chat_id: `@${username}`,
              message_id: messageId,
              disable_notification: true,
            });
            pinned = pinData.ok;
          }
          results.push({ channel: username, success: true, messageId, pinned });
        } catch (e) {
          results.push({ channel: username, success: false, error: e.message });
        }
      }

      return Response.json({ success: true, results });
    }

    if (action === 'delete') {
      if (!BOT) return Response.json({ success: false, error: 'TELEGRAM_BOT_TOKEN not configured' }, { status: 500 });
      const { channelUsername, messageId } = body;
      const data = await tg('deleteMessage', { chat_id: `@${channelUsername}`, message_id: messageId });
      return Response.json({ success: data.ok, error: data.ok ? null : botError(data.description) });
    }

    return Response.json({ success: false, error: 'Unknown action' }, { status: 400 });

  } catch (err) {
    console.error('Calendar route error:', err);
    return Response.json({ success: false, error: err.message || 'Server error' }, { status: 500 });
  }
}
