'use client';

import { useState } from 'react';

export default function MainDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [selectedSubject, setSelectedSubject] = useState('Common');
  const [expandedChannel, setExpandedChannel] = useState(null);

  const channels = [
    { subject: 'Common', name: '@testbook_ugcnet', subs: 40637, posts: 12, rate: 8.5, teacher: '' },
    { subject: 'Paper 1', name: '@pritipaper1', subs: 21161, posts: 11, rate: 8.9, teacher: 'Priti' },
    { subject: 'Paper 1', name: '@tulikamam', subs: 15125, posts: 8, rate: 7.1, teacher: 'Tulika' },
    { subject: 'Paper 1', name: '@Anshikamaamtestbook', subs: 11932, posts: 10, rate: 8.3, teacher: 'Anshika' },
    { subject: 'Paper 1', name: '@testbookrajatsir', subs: 3897, posts: 7, rate: 6.8, teacher: 'Rajat Sir' },
    { subject: 'Political Science', name: '@pradyumansir_testbook', subs: 28967, posts: 9, rate: 7.2, teacher: '' },
    { subject: 'History', name: '@AshwaniSir_Testbook', subs: 13400, posts: 9, rate: 7.5, teacher: '' },
    { subject: 'Public Administration', name: '@kiranmaamtestbook', subs: 6204, posts: 6, rate: 6.2, teacher: '' },
    { subject: 'Sociology', name: '@Manojsonker_Testbook', subs: 5496, posts: 7, rate: 6.8, teacher: '' },
    { subject: 'Education', name: '@Heenamaam_testbook', subs: 4887, posts: 8, rate: 7.1, teacher: '' },
    { subject: 'Home Science', name: '@AditiMaam_Testbook', subs: 4212, posts: 6, rate: 5.9, teacher: '' },
    { subject: 'Law', name: '@karanSir_Testbook', subs: 3418, posts: 5, rate: 5.2, teacher: '' },
    { subject: 'English', name: '@testbookdakshita', subs: 2976, posts: 6, rate: 5.8, teacher: '' },
    { subject: 'Geography', name: '@AshishSir_Testbook', subs: 1424, posts: 4, rate: 4.5, teacher: '' },
    { subject: 'Economics', name: '@ShachiMaam_Testbook', subs: 1376, posts: 5, rate: 4.8, teacher: '' },
    { subject: 'Management', name: '@Monikamaamtestbook', subs: 1249, posts: 3, rate: 3.9, teacher: '' },
    { subject: 'Management', name: '@yogitamaamtestbook', subs: 1201, posts: 4, rate: 4.2, teacher: '' },
    { subject: 'Environmental Science', name: '@EVS_AnshikamaamTestbook', subs: 1085, posts: 3, rate: 3.5, teacher: '' },
    { subject: 'Library Science', name: '@daminimaam_testbook', subs: 908, posts: 2, rate: 2.8, teacher: '' },
    { subject: 'Computer Science', name: '@TestbookShahna', subs: 847, posts: 5, rate: 4.6, teacher: '' },
    { subject: 'Sanskrit', name: '@Prakashsirtestbook', subs: 763, posts: 3, rate: 3.1, teacher: '' },
    { subject: 'Hindi', name: '@kesharisir_testbook', subs: 752, posts: 4, rate: 3.8, teacher: '' },
    { subject: 'Commerce', name: '@TestbookNiharikaMaam', subs: 696, posts: 2, rate: 2.5, teacher: '' },
    { subject: 'Psychology', name: '@MrinaliniMaam_Testbook', subs: 623, posts: 3, rate: 3.2, teacher: '' },
    { subject: 'Physical Education', name: '@testbook_gauravsir', subs: 112, posts: 1, rate: 1.5, teacher: '' },
  ];

  const subjects = Array.from(new Set(channels.map(c => c.subject)));
  const filtered = channels.filter(c => c.subject === selectedSubject);
  const totalSubs = channels.reduce((sum, c) => sum + c.subs, 0);
  const totalPosts = channels.reduce((sum, c) => sum + c.posts, 0);
  const avgRate = (channels.reduce((sum, c) => sum + c.rate, 0) / channels.length).toFixed(1);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      <div style={{ background: 'linear-gradient(to right, #002D5B, #0047AB)', padding: '24px', textAlign: 'center', color: 'white' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: 0 }}>UGC NET Telegram Intelligence Hub</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>Real-time insights into all 25 UGC NET Testbook channels</p>
      </div>

      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 16px', display: 'flex', justifyContent: 'center', gap: '32px', flexWrap: 'wrap' }}>
        {['analytics', 'digest', 'trends', 'competitive', 'ideas'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '16px 0',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
              color: activeTab === tab ? '#2563eb' : '#6b7280',
              fontWeight: activeTab === tab ? 600 : 500,
            }}
          >
            {tab === 'analytics' && '📊 Analytics'}
            {tab === 'digest' && '📋 Digest'}
            {tab === 'trends' && '📈 Trends'}
            {tab === 'competitive' && '✖ Competitive'}
            {tab === 'ideas' && '💡 Ideas'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 16px' }}>
        {activeTab === 'analytics' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
              <div style={{ background: 'white', padding: '24px', borderRadius: '8px', borderLeft: '4px solid #2563eb' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(totalSubs / 1000).toFixed(0)}K</div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Total Subscribers</div>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '8px', borderLeft: '4px solid #16a34a' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{avgRate}%</div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Avg View Rate</div>
              </div>
              <div style={{ background: 'white', padding: '24px', borderRadius: '8px', borderLeft: '4px solid #d97706' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalPosts}</div>
                <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Total Posts</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '8px' }}>
              {subjects.map(subj => (
                <button
                  key={subj}
                  onClick={() => setSelectedSubject(subj)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: 'none',
                    background: selectedSubject === subj ? '#3b82f6' : '#f3f4f6',
                    color: selectedSubject === subj ? 'white' : '#374151',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                  }}
                >
                  {subj}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filtered.map(channel => (
                <div key={channel.name} style={{ background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '16px',
                      cursor: 'pointer',
                      borderBottom: expandedChannel === channel.name ? '1px solid #e5e7eb' : 'none',
                    }}
                    onClick={() => setExpandedChannel(expandedChannel === channel.name ? null : channel.name)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 600 }}>
                          {channel.subject}
                          {channel.teacher && ` - ${channel.teacher}`}
                        </h3>
                        <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>{channel.name}</p>
                      </div>
                      <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Own</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', fontSize: '13px' }}>
                      <div>
                        <p style={{ margin: '0', color: '#6b7280' }}>Subs</p>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{(channel.subs / 1000).toFixed(1)}K</p>
                      </div>
                      <div>
                        <p style={{ margin: '0', color: '#6b7280' }}>Posts</p>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{channel.posts}</p>
                      </div>
                      <div>
                        <p style={{ margin: '0', color: '#6b7280' }}>Rate</p>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>{channel.rate}%</p>
                      </div>
                      <div>
                        <p style={{ margin: '0', color: '#6b7280' }}>Status</p>
                        <p style={{ margin: '4px 0 0 0', fontWeight: 600 }}>Active</p>
                      </div>
                    </div>
                    <button style={{ margin: '8px 0 0 0', background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '12px', fontWeight: 500, padding: 0 }}>
                      {expandedChannel === channel.name ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  {expandedChannel === channel.name && (
                    <div style={{ padding: '16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb' }}>
                      <a href={`https://t.me/${channel.name.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontSize: '13px', textDecoration: 'none', fontWeight: 500 }}>
                        Open on Telegram
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginTop: '40px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Competitors</h3>
              <div style={{ background: '#f3f4f6', padding: '32px', borderRadius: '8px', textAlign: 'center' }}>
                <p style={{ margin: '0', color: '#6b7280', fontWeight: 500 }}>Waiting for competitor handles...</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'digest' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <h2 style={{ margin: 0 }}>Daily Digest</h2>
            <p style={{ color: '#6b7280' }}>Summary of your channels</p>
          </div>
        )}

        {activeTab === 'trends' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ margin: 0 }}>7-Day Trends</h3>
            <p style={{ color: '#6b7280' }}>Charts coming soon</p>
          </div>
        )}

        {activeTab === 'competitive' && (
          <div style={{ background: '#dbeafe', padding: '32px', borderRadius: '8px', textAlign: 'center' }}>
            <p style={{ margin: 0, color: '#075985', fontWeight: 600 }}>Competitive Intel</p>
            <p style={{ margin: '8px 0 0 0', color: '#0c4a6e' }}>Waiting for competitor handles</p>
          </div>
        )}

        {activeTab === 'ideas' && (
          <div style={{ background: 'white', padding: '24px', borderRadius: '8px' }}>
            <h3 style={{ margin: 0 }}>Ideas</h3>
            <p style={{ color: '#6b7280' }}>Strategic recommendations</p>
          </div>
        )}
      </div>

      <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '32px 16px', textAlign: 'center', marginTop: '48px' }}>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>Generated {new Date().toLocaleDateString()}</p>
        <p style={{ margin: '8px 0 0 0', color: '#9ca3af', fontSize: '12px' }}>UGC NET Telegram Intelligence Hub</p>
      </div>
    </div>
  );
}
