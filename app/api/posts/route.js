export const dynamic = 'force-dynamic';

const BOT = process.env.TELEGRAM_BOT_TOKEN;

export async function GET() {
  if (!BOT) return Response.json({ success: false, error: 'Bot token not set' }, { status: 500 });

  try {
    // getUpdates with allowed_updates=channel_post gives us real channel posts
    // We don't advance the offset so we don't consume the update queue
    const res = await fetch(
      `https://api.telegram.org/bot${BOT}/getUpdates?limit=100&timeout=0&allowed_updates=%5B%22channel_post%22%5D`,
      { cache: 'no-store' }
    );
    const data = await res.json();

    if (!data.ok) {
      return Response.json({ success: false, error: data.description || 'Telegram error' });
    }

    // Counts per channel per date + actual posts list
    // counts: { "2026-04-22": { "testbook_ugcnet": 4 } }
    // posts:  { "2026-04-22": { "testbook_ugcnet": [{text, type, time}] } }
    const counts = {};
    const posts  = {};

    for (const update of data.result || []) {
      const post = update.channel_post;
      if (!post) continue;

      // Convert Unix timestamp → IST date string
      const ist = new Date(post.date * 1000 + 5.5 * 60 * 60 * 1000);
      const dateKey = ist.toISOString().slice(0, 10);
      const timeStr = ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

      const chatKey = (post.chat.username || String(Math.abs(post.chat.id))).toLowerCase();

      // Count
      if (!counts[dateKey]) counts[dateKey] = {};
      counts[dateKey][chatKey] = (counts[dateKey][chatKey] || 0) + 1;

      // Store post preview (text or poll or photo)
      if (!posts[dateKey]) posts[dateKey] = {};
      if (!posts[dateKey][chatKey]) posts[dateKey][chatKey] = [];

      let type = 'Message';
      let preview = '';

      if (post.poll) {
        type = 'MCQ Poll';
        preview = post.poll.question?.slice(0, 80) || '';
      } else if (post.photo) {
        type = 'Photo';
        preview = post.caption?.slice(0, 80) || '(image)';
      } else if (post.video) {
        type = 'Video';
        preview = post.caption?.slice(0, 80) || '(video)';
      } else if (post.document) {
        type = 'Document';
        preview = post.caption?.slice(0, 80) || post.document.file_name || '(file)';
      } else if (post.text) {
        // Detect content type from text
        const t = post.text.toLowerCase();
        if (t.includes('youtube.com') || t.includes('youtu.be') || t.includes('class') || t.includes('lecture')) type = 'YouTube Class';
        else if (t.includes('mcq') || t.includes('question') || t.includes('answer') || t.includes('option')) type = 'MCQ';
        else if (t.includes('pdf') || t.includes('notes') || t.includes('download')) type = 'PDF Notes';
        else if (t.includes('current affairs') || t.includes('ca ') || t.includes('today\'s')) type = 'Current Affairs';
        else type = 'Post';
        preview = post.text.slice(0, 80);
      }

      posts[dateKey][chatKey].push({
        type,
        preview,
        time: timeStr,
        messageId: post.message_id,
      });
    }

    return Response.json({
      success: true,
      counts,
      posts,
      totalUpdates: data.result?.length || 0,
      note: 'Real posts from Telegram bot getUpdates · covers ~48h window',
    });

  } catch (err) {
    console.error('Posts API error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
