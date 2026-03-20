'use client';

import React, { useState } from 'react';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('channel-analytics');
  const [selectedSubject, setSelectedSubject] = useState('Common');
  const [expandedChannel, setExpandedChannel] = useState(null);

  const allChannels = [
    { subject: 'Common', username: '@testbook_ugcnet', subs: 40637, posts: 12, viewRate: 8.5 },
    { subject: 'Paper 1', username: '@pritipaper1', teacher: 'Priti', subs: 21161, posts: 11, viewRate: 8.9 },
    { subject: 'Paper 1', username: '@tulikamam', teacher: 'Tulika', subs: 15125, posts: 8, viewRate: 7.1 },
    { subject: 'Paper 1', username: '@Anshikamaamtestbook', teacher: 'Anshika', subs: 11932, posts: 10, viewRate: 8.3 },
    { subject: 'Paper 1', username: '@testbookrajatsir', teacher: 'Rajat Sir', subs: 3897, posts: 7, viewRate: 6.8 },
    { subject: 'Political Science', username: '@pradyumansir_testbook', subs: 28967, posts: 9, viewRate: 7.2 },
    { subject: 'History', username: '@AshwaniSir_Testbook', subs: 13400, posts: 9, viewRate: 7.5 },
    { subject: 'Public Administration', username: '@kiranmaamtestbook', subs: 6204, posts: 6, viewRate: 6.2 },
    { subject: 'Sociology', username: '@Manojsonker_Testbook', subs: 5496, posts: 7, viewRate: 6.8 },
    { subject: 'Education', username: '@Heenamaam_testbook', subs: 4887, posts: 8, viewRate: 7.1 },
    { subject: 'Home Science', username: '@AditiMaam_Testbook', subs: 4212, posts: 6, viewRate: 5.9 },
    { subject: 'Law', username: '@karanSir_Testbook', subs: 3418, posts: 5, viewRate: 5.2 },
    { subject: 'English', username: '@testbookdakshita', subs: 2976, posts: 6, viewRate: 5.8 },
    { subject: 'Geography', username: '@AshishSir_Testbook', subs: 1424, posts: 4, viewRate: 4.5 },
    { subject: 'Economics', username: '@ShachiMaam_Testbook', subs: 1376, posts: 5, viewRate: 4.8 },
    { subject: 'Management', username: '@Monikamaamtestbook', subs: 1249, posts: 3, viewRate: 3.9 },
    { subject: 'Management', username: '@yogitamaamtestbook', subs: 1201, posts: 4, viewRate: 4.2 },
    { subject: 'Environmental Science', username: '@EVS_AnshikamaamTestbook', subs: 1085, posts: 3, viewRate: 3.5 },
    { subject: 'Library Science', username: '@daminimaam_testbook', subs: 908, posts: 2, viewRate: 2.8 },
    { subject: 'Computer Science', username: '@TestbookShahna', subs: 847, posts: 5, viewRate: 4.6 },
    { subject: 'Sanskrit', username: '@Prakashsirtestbook', subs: 763, posts: 3, viewRate: 3.1 },
    { subject: 'Hindi', username: '@kesharisir_testbook', subs: 752, posts: 4, viewRate: 3.8 },
    { subject: 'Commerce', username: '@TestbookNiharikaMaam', subs: 696, posts: 2, viewRate: 2.5 },
    { subject: 'Psychology', username: '@MrinaliniMaam_Testbook', subs: 623, posts: 3, viewRate: 3.2 },
    { subject: 'Physical Education', username: '@testbook_gauravsir', subs: 112, posts: 1, viewRate: 1.5 },
  ];

  const uniqueSubjects = Array.from(new Set(allChannels.map(ch => ch.subject)));
  const totalSubs = allChannels.reduce((sum, ch) => sum + ch.subs, 0);
  const totalPosts = allChannels.reduce((sum, ch) => sum + ch.posts, 0);
  const avgViewRate = (allChannels.reduce((sum, ch) => sum + ch.viewRate, 0) / allChannels.length).toFixed(1);
  const channelsBySubject = allChannels.filter(ch => ch.subject === selectedSubject);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="bg-gradient-to-r from-blue-900 to-blue-600 py-6 px-4 text-center text-white">
        <h1 className="text-3xl font-bold">UGC NET Telegram Intelligence Hub</h1>
        <p className="mt-2 text-blue-100">Real-time insights into all 25 UGC NET Testbook channels</p>
      </div>

      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex justify-center gap-8 px-4 py-0 flex-wrap max-w-7xl mx-auto">
          {['channel-analytics', 'daily-digest', 'trend-charts', 'competitive', 'ideas'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium transition-colors text-sm md:text-base ${
                activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'channel-analytics' && '📊 Channel Analytics'}
              {tab === 'daily-digest' && '📋 Daily Digest'}
              {tab === 'trend-charts' && '📈 Trend Charts'}
              {tab === 'competitive' && '✖ Competitive Intel'}
              {tab === 'ideas' && '💡 Ideas'}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'channel-analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <p className="text-2xl font-bold text-gray-900">{(totalSubs / 1000).toFixed(0)}K</p>
                <p className="text-gray-600 text-sm mt-1">Total Subscribers</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <p className="text-2xl font-bold text-gray-900">{avgViewRate}%</p>
                <p className="text-gray-600 text-sm mt-1">Avg View Rate</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
                <p className="text-2xl font-bold text-gray-900">{totalPosts}</p>
                <p className="text-gray-600 text-sm mt-1">Total Posts</p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-hide">
              {uniqueSubjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`px-4 py-2 rounded-full font-medium transition-colors text-sm whitespace-nowrap flex-shrink-0 ${
                    selectedSubject === subject ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {channelsBySubject.map((channel) => (
                <div key={channel.username} className="bg-white rounded-lg shadow overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedChannel(expandedChannel === channel.username ? null : channel.username)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-gray-900">
                          {channel.subject}
                          {channel.teacher && ` - ${channel.teacher}`}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">{channel.username}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">Own</span>
                    </div>
                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600">Subscribers</p>
                        <p className="font-bold text-gray-900">{(channel.subs / 1000).toFixed(1)}K</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Posts</p>
                        <p className="font-bold text-gray-900">{channel.posts}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">View Rate</p>
                        <p className="font-bold text-gray-900">{channel.viewRate}%</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Channels</p>
                        <p className="font-bold text-gray-900">25</p>
                      </div>
                    </div>
                    <button className="text-blue-600 font-medium text-sm mt-3 hover:text-blue-800">
                      tap to expand {expandedChannel === channel.username ? '▼' : '▶'}
                    </button>
                  </div>
                  {expandedChannel === channel.username && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <a
                        href={`https://t.me/${channel.username.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-sm font-medium hover:text-blue-800"
                      >
                        Open on Telegram →
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🔴 Competitors</h3>
              <div className="bg-gray-100 p-8 rounded-lg text-center">
                <p className="text-gray-700 font-medium">Waiting for competitor handles...</p>
                <p className="text-gray-500 text-sm mt-2">Share competitor Telegram handles to populate this section</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'daily-digest' && (
          <div>
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-8 text-white mb-6">
              <h2 className="text-2xl font-bold">Daily Digest</h2>
              <p className="text-purple-100 mt-1">Today's Summary</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <h4 className="font-bold text-gray-900 mb-3">📈 Network Reach</h4>
                <p className="text-sm text-gray-700">Total: {totalSubs.toLocaleString()} subscribers</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h4 className="font-bold text-gray-900 mb-3">📊 Top Channel</h4>
                <p className="text-sm text-gray-700">Common - 40.6K subscribers</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
                <h4 className="font-bold text-gray-900 mb-3">📝 Activity</h4>
                <p className="text-sm text-gray-700">{totalPosts} total posts</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trend-charts' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-gray-900 mb-4">📈 7-Day Trends</h3>
            <p className="text-gray-600">Trending chart data loading...</p>
          </div>
        )}

        {activeTab === 'competitive' && (
          <div className="bg-blue-100 p-8 rounded-lg text-center border-l-4 border-blue-600">
            <p className="text-blue-900 font-bold text-lg">📊 Competitive Intel</p>
            <p className="text-blue-700 mt-2">Waiting for competitor handles...</p>
          </div>
        )}

        {activeTab === 'ideas' && (
          <div>
            <div className="bg-green-100 p-8 rounded-lg text-center border-l-4 border-green-600 mb-6">
              <p className="text-green-900 font-bold text-lg">💡 Ideas & Insights</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                <h4 className="font-bold text-gray-900 mb-2">🔵 Core Strength</h4>
                <p className="text-sm text-gray-700">Common and Paper 1 show highest engagement</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                <h4 className="font-bold text-gray-900 mb-2">📈 Growth</h4>
                <p className="text-sm text-gray-700">Subject channels have growth potential</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow border-l-4 border-amber-500">
                <h4 className="font-bold text-gray-900 mb-2">💡 Strategy</h4>
                <p className="text-sm text-gray-700">Leverage Paper 1 formats across channels</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white border-t border-gray-200 mt-12 py-8 px-4 text-center">
        <p className="text-gray-600 text-sm">Generated {new Date().toLocaleDateString()}</p>
        <p className="text-gray-500 text-xs mt-2">UGC NET Telegram Intelligence Hub</p>
      </div>
    </div>
  );
}
