export async function GET() {
  const channels = [
    { username: 'testbook_ugcnet', label: 'UGC NET Common', subscribers: 40914 },
    { username: 'pritipaper1', label: 'Paper 1 - Priti', subscribers: 21161 },
    { username: 'tulikamam', label: 'Paper 1 - Tulika', subscribers: 15125 },
    { username: 'Anshikamaamtestbook', label: 'Paper 1 - Anshika', subscribers: 11932 },
    { username: 'testbookrajatsir', label: 'Paper 1 - Rajat Sir', subscribers: 3897 },
    { username: 'pradyumansir_testbook', label: 'Political Science', subscribers: 28967 },
    { username: 'AshwaniSir_Testbook', label: 'History', subscribers: 13400 },
    { username: 'kiranmaamtestbook', label: 'Public Administration', subscribers: 6204 },
    { username: 'Manojsonker_Testbook', label: 'Sociology', subscribers: 5496 },
    { username: 'Heenamaam_testbook', label: 'Education', subscribers: 4887 },
    { username: 'AditiMaam_Testbook', label: 'Home Science', subscribers: 4212 },
    { username: 'karanSir_Testbook', label: 'Law', subscribers: 3418 },
    { username: 'testbookdakshita', label: 'English', subscribers: 2976 },
    { username: 'AshishSir_Testbook', label: 'Geography', subscribers: 1424 },
    { username: 'ShachiMaam_Testbook', label: 'Economics', subscribers: 1376 },
    { username: 'Monikamaamtestbook', label: 'Management', subscribers: 1249 },
    { username: 'yogitamaamtestbook', label: 'Management', subscribers: 1201 },
    { username: 'EVS_AnshikamaamTestbook', label: 'Environmental Science', subscribers: 1085 },
    { username: 'daminimaam_testbook', label: 'Library Science', subscribers: 908 },
    { username: 'TestbookShahna', label: 'Computer Science', subscribers: 847 },
    { username: 'Prakashsirtestbook', label: 'Sanskrit', subscribers: 763 },
    { username: 'kesharisir_testbook', label: 'Hindi', subscribers: 752 },
    { username: 'TestbookNiharikaMaam', label: 'Commerce', subscribers: 696 },
    { username: 'MrinaliniMaam_Testbook', label: 'Psychology', subscribers: 623 },
    { username: 'testbook_gauravsir', label: 'Physical Education', subscribers: 112 },
  ];

  const totalSubscribers = channels.reduce((sum, c) => sum + c.subscribers, 0);

  return Response.json({
    success: true,
    totalSubscribers: totalSubscribers,
    channels: channels,
    fetchedAt: new Date().toISOString(),
  });
}
