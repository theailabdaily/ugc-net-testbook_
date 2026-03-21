import { NextResponse } from 'next/server';

const CHANNELS = [
  { username: 'testbook_ugcnet', label: 'UGC NET Common', group: 'Core' },
  { username: 'pradyumansir_testbook', label: 'Political Science - Pradyuman Sir', group: 'Core' },
  { username: 'pritipaper1', label: 'Paper 1 - Priti Maam', group: 'Core' },
  { username: 'tulikamam', label: 'Paper 1 - Tulika Maam', group: 'Core' },
  { username: 'Anshikamaamtestbook', label: 'Anshika Maam', group: 'Core' },
  { username: 'testbookrajatsir', label: 'Rajat Sir', group: 'Core' },
  { username: 'AshwaniSir_Testbook', label: 'History - Ashwani Sir', group: 'Core' },
  { username: 'kiranmaamtestbook', label: 'Kiran Maam', group: 'Core' },
  { username: 'Manojsonker_Testbook', label: 'Manoj Sonker Sir', group: 'Core' },
  { username: 'Heenamaam_testbook', label: 'Heena Maam', group: 'Core' },
  { username: 'AditiMaam_Testbook', label: 'Aditi Maam', group: 'Core' },
  { username: 'karanSir_Testbook', label: 'Karan Sir', group: 'Core' },
  { username: 'testbookdakshita', label: 'Dakshita Maam', group: 'Core' },
  { username: 'AshishSir_Testbook', label: 'Ashish Sir', group: 'Core' },
  { username: 'ShachiMaam_Testbook', label: 'Shachi Maam', group: 'Core' },
  { username: 'Monikamaamtestbook', label: 'Monika Maam', group: 'Core' },
  { username: 'yogitamaamtestbook', label: 'Yogita Maam', group: 'Core' },
  { username: 'EVS_AnshikamaamTestbook', label: 'EVS - Anshika Maam', group: 'Core' },
  { username: 'daminimaam_testbook', label: 'Damini Maam', group: 'Core' },
  { username: 'TestbookShahna', label: 'Computer Science - Shahna', group: 'Core' },
  { username: 'Prakashsirtestbook', label: 'Prakash Sir', group: 'Core' },
  { username: 'kesharisir_testbook', label: 'Keshari Sir', group: 'Core' },
  { username: 'TestbookNiharikaMaam', label: 'Niharika Maam', group: 'Core' },
  { username: 'MrinaliniMaam_Testbook', label: 'Mrinalini Maam', group: 'Core' },
  { username: 'testbook_gauravsir', label: 'Gaurav Sir', group: 'Core' },
];

async function fetchChannelData(channel, token) {
  const base = `https://api.telegram.org/bot${token}`;
  try {
    const [chatRes, countRes] = await Promise.all([
      fetch(`${base}/getChat?chat_id=@${channel.username}`),
      fetch(`${base}/getChatMemberCount?chat_id=@${channel.username}`)
    ]);
    const chatData = await chatRes.json();
    const countData = await countRes.json();
    return {
      username: channel.username,
      label: channel.label,
      group: channel.group,
      title: chatData.result?.title || channel.label,
      description: chatData.result?.description || '',
      subscribers: countData.result || 0,
      error: null
    };
  } catch (err) {
    return {
      username: channel.username,
      label: channel.label,
      group: channel.group,
      title: channel.label,
      description: '',
      subscribers: 0,
      error: err.message
    };
  }
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { success: false, error: 'TELEGRAM_BOT_TOKEN not set' },
      { status: 500 }
    );
  }
  try {
    const results = await Promise.allSettled(
      CHANNELS.map(ch => fetchChannelData(ch, token))
    );
    const channels = results.map(r =>
      r.status === 'fulfilled' ? r.value : { subscribers: 0, error: String(r.reason) }
    );
    const totalSubscribers = channels.reduce((sum, ch) => sum + (ch.subscribers || 0), 0);
    return NextResponse.json({
      success: true,
      fetchedAt: new Date().toISOString(),
      totalSubscribers,
      channels
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
