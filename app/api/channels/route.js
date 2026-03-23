export const dynamic = 'force-dynamic';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const OWN_CHANNELS = [
  { username: 'testbook_ugcnet',       label: 'UGC NET Common' },
  { username: 'pritipaper1',           label: 'Paper 1 - Priti' },
  { username: 'tulikamam',             label: 'Paper 1 - Tulika' },
  { username: 'Anshikamaamtestbook',   label: 'Paper 1 - Anshika' },
  { username: 'testbookrajatsir',      label: 'Paper 1 - Rajat Sir' },
  { username: 'pradyumansir_testbook', label: 'Political Science' },
  { username: 'AshwaniSir_Testbook',   label: 'History' },
  { username: 'kiranmaamtestbook',     label: 'Public Administration' },
  { username: 'Manojsonker_Testbook',  label: 'Sociology' },
  { username: 'Heenamaam_testbook',    label: 'Education' },
  { username: 'AditiMaam_Testbook',    label: 'Home Science' },
  { username: 'karanSir_Testbook',     label: 'Law' },
  { username: 'testbookdakshita',      label: 'English' },
  { username: 'AshishSir_Testbook',    label: 'Geography' },
  { username: 'ShachiMaam_Testbook',   label: 'Economics' },
  { username: 'Monikamaamtestbook',    label: 'Management' },
  { username: 'yogitamaamtestbook',    label: 'Management' },
  { username: 'EVS_AnshikamaamTestbook', label: 'Environmental Science' },
  { username: 'daminimaam_testbook',   label: 'Library Science' },
  { username: 'TestbookShahna',        label: 'Computer Science' },
  { username: 'Prakashsirtestbook',    label: 'Sanskrit' },
  { username: 'kesharisir_testbook',   label: 'Hindi' },
  { username: 'TestbookNiharikaMaam',  label: 'Commerce' },
  { username: 'MrinaliniMaam_Testbook',label: 'Psychology' },
  { username: 'testbook_gauravsir',    label: 'Physical Education' },
];

async function fetchOne(username) {
  const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
  try {
    const [chatRes, countRes] = await Promise.all([
      Promise.race([fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChat?chat_id=@${username}`), timeout(4000)]),
      Promise.race([fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMemberCount?chat_id=@${username}`), timeout(4000)]),
    ]);
    const chatData  = await chatRes.json();
    const countData = await countRes.json();
    if (!chatData.ok) return { username, label: username, title: username, description: '', subscribers: 0, live: false };
    return {
      username,
      label:       chatData.result.title || username,
      title:       chatData.result.title || username,
      description: chatData.result.description || '',
      subscribers: countData.ok ? countData.result : 0,
      live: true,
    };
  } catch {
    return { username, label: username, title: username, description: '', subscribers: 0, live: false };
  }
}

async function fetchBatch(usernames) {
  const BATCH = 20; // 4 batches of 20 for ~80 competitors, no delay = ~2s total
  const results = [];
  for (let i = 0; i < usernames.length; i += BATCH) {
    const batch = usernames.slice(i, i + BATCH);
    const batchResults = await Promise.all(batch.map(fetchOne));
    results.push(...batchResults);
  }
  return results;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  // Competitor lookup: /api/channels?type=competitors&usernames=a,b,c
  if (type === 'competitors') {
    const usernamesParam = searchParams.get('usernames') || '';
    const usernames = usernamesParam.split(',').map(u => u.trim()).filter(Boolean);
    if (!usernames.length) return Response.json({ success: false, error: 'No usernames provided' }, { status: 400 });
    const channels = await fetchBatch(usernames);
    return Response.json({ success: true, channels, fetchedAt: new Date().toISOString() });
  }

  // Default: own channels
  const channels = await fetchBatch(OWN_CHANNELS.map(c => c.username));
  const labeled = channels.map((ch, i) => ({ ...ch, label: OWN_CHANNELS[i]?.label || ch.label }));
  const totalSubscribers = labeled.reduce((s, c) => s + c.subscribers, 0);
  return Response.json({
    success: true,
    totalSubscribers,
    channels: labeled,
    fetchedAt: new Date().toISOString(),
    isLive: true,
  });
}
