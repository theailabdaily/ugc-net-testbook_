'use client';
import { useEffect, useMemo, useState } from 'react';
import DateRangePicker, { PRESETS } from './date-range-picker';
import SubjectMultiSelect, { applySubjectFilter } from './subject-multiselect';
import { fetchWithRetry } from '../lib/fetch-with-retry';

// ─────────────────────────── mappings ───────────────────────────
const SUBJECTS = {
  testbook_ugcnet: 'Common',
  pritipaper1: 'Paper 1 · Priti',
  tulikamam: 'Paper 1 · Tulika',
  anshikamaamtestbook: 'Paper 1 · Anshika',
  testbookrajatsir: 'Paper 1 · Rajat Sir',
  pradyumansir_testbook: 'Political Science',
  ashwanisir_testbook: 'History',
  kiranmaamtestbook: 'Public Administration',
  manojsonker_testbook: 'Sociology',
  heenamaam_testbook: 'Education',
  aditimaam_testbook: 'Home Science',
  karansir_testbook: 'Law',
  testbookdakshita: 'English',
  ashishsir_testbook: 'Geography',
  shachimaam_testbook: 'Economics',
  monikamaamtestbook: 'Management 1',
  yogitamaamtestbook: 'Management 2',
  evs_anshikamaamtestbook: 'Environmental Science',
  daminimaam_testbook: 'Library Science',
  testbookshahna: 'Computer Science',
  prakashsirtestbook: 'Sanskrit',
  kesharisir_testbook: 'Hindi',
  testbookniharikamaam: 'Commerce',
  mrinalinimaam_testbook: 'Psychology',
  testbook_gauravsir: 'Physical Education',
};

const POST_TYPE_COLORS = {
  'MCQ Poll': '#3b82f6', 'Poll': '#3b82f6', 'YouTube Class': '#dc2626',
  'Link': '#06b6d4', 'Photo': '#10b981', 'Document': '#10b981',
  'Video': '#dc2626', 'Audio': '#8b5cf6', 'Telegram Link': '#0ea5e9',
  'Message': '#64748b',
};

// ─────────────────────────── formatters ───────────────────────────
function fmtNum(n) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  if (n >= 1e7) return (n / 1e7).toFixed(2) + 'Cr';
  if (n >= 1e5) return (n / 1e5).toFixed(2) + 'L';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString('en-IN');
}
function fmtPct(n, d = 1) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return n.toFixed(d) + '%';
}
function fmtSigned(n) {
  if (n === null || n === undefined || !isFinite(n)) return '—';
  return (n > 0 ? '+' : '') + fmtNum(n);
}
function deltaPct(curr, prev) {
  if (curr === null || curr === undefined || prev === null || prev === undefined || prev === 0) return null;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function aggregate(channels) {
  if (!channels || channels.length === 0) return null;
  let subs=0, joined=0, lost=0, posts=0, views=0, forwards=0, reactions=0;
  let withEng=0, engSum=0, withNotif=0, notifSum=0;
  for (const c of channels) {
    subs += c.subscribers || 0;
    joined += c.subsGained || 0;
    lost += c.subsLost || 0;
    posts += c.posts || 0;
    views += c.totalViews || 0;
    forwards += c.totalForwards || 0;
    reactions += c.totalReactions || 0;
    if (c.engagementRate !== null && c.engagementRate !== undefined) { withEng++; engSum += c.engagementRate; }
    if (c.notifPct !== null && c.notifPct !== undefined) { withNotif++; notifSum += c.notifPct; }
  }
  return {
    subs, joined, lost, net: joined - lost,
    posts, views, forwards, reactions,
    avgEng: withEng ? engSum / withEng : null,
    avgNotif: withNotif ? notifSum / withNotif : null,
  };
}

// ─────────────────────────── component ───────────────────────────
export default function OverviewSection() {
  const [range, setRange]                 = useState(() => ({ ...PRESETS.last30d(), preset: 'last30d' }));
  const [data, setData]                   = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [filterSubjects, setFilterSubjects] = useState([]);

  const [briefing, setBriefing]           = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState(null);

  const [retryStatus, setRetryStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRetryStatus(null);
    fetchWithRetry(
      `/api/overview-metrics?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`,
      {},
      {
        onRetry: ({ attempt, status }) => {
          if (!cancelled) setRetryStatus(`Server warming up (attempt ${attempt + 1})…`);
        },
      },
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) { setError(d.error || 'unknown'); setData(null); }
        else { setData(d); setError(null); }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) { setLoading(false); setRetryStatus(null); } });
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  // Reset briefing when range or filter changes
  useEffect(() => { setBriefing(null); setBriefingError(null); }, [range.from, range.to, filterSubjects.join(',')]);

  // Subject options derived from current data
  const allSubjects = useMemo(() => {
    const set = new Set();
    (data?.current?.channels || []).forEach((c) => set.add(SUBJECTS[c.username] || c.username));
    return Array.from(set).sort();
  }, [data]);

  // Apply subject filter to all data slices
  const currChannels = useMemo(
    () => applySubjectFilter(data?.current?.channels, filterSubjects, SUBJECTS),
    [data, filterSubjects]
  );
  const priorChannels = useMemo(
    () => applySubjectFilter(data?.prior?.channels, filterSubjects, SUBJECTS),
    [data, filterSubjects]
  );
  const filteredTopPosts = useMemo(() => {
    if (!data?.topPosts) return [];
    if (filterSubjects.length === 0) return data.topPosts.slice(0, 5);
    if (filterSubjects.includes('__none__')) return [];
    return data.topPosts.filter((p) => {
      const subj = SUBJECTS[p.chatUsername] || p.chatUsername;
      return filterSubjects.includes(subj);
    }).slice(0, 5);
  }, [data, filterSubjects]);

  const aggCurr  = useMemo(() => aggregate(currChannels), [currChannels]);
  const aggPrior = useMemo(() => aggregate(priorChannels), [priorChannels]);

  // Top movers
  const sortedByNet = useMemo(() => {
    return [...(currChannels || [])]
      .filter((c) => c.subsNet !== null && c.subsNet !== undefined)
      .sort((a, b) => (b.subsNet || 0) - (a.subsNet || 0));
  }, [currChannels]);
  const topGainers = sortedByNet.slice(0, 5);
  const topLosers  = sortedByNet.slice(-5).reverse();

  const fetchBriefing = async () => {
    if (!currChannels?.length) return;
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const subjectsLabel = filterSubjects.length === 0 || filterSubjects.length === allSubjects.length
        ? 'All subjects' : filterSubjects.join(', ');
      const res = await fetchWithRetry('/api/portfolio-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current:  { from: range.from, to: range.to, channels: currChannels },
          prior:    data?.prior ? { ...data.prior, channels: priorChannels } : null,
          topPosts: filteredTopPosts,
          range,
          subjectsLabel,
        }),
      });
      const json = await res.json();
      if (json.ok) setBriefing(json);
      else setBriefingError(json.error || 'failed');
    } catch (e) { setBriefingError(e.message); }
    finally { setBriefingLoading(false); }
  };

  return (
    <div>
      <Header range={range} />

      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 12px', background: '#fff', border: '1px solid #e2e8f0',
        borderRadius: 10, marginBottom: 14,
      }}>
        <DateRangePicker value={range} onChange={setRange} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <SubjectMultiSelect
            options={allSubjects}
            value={filterSubjects}
            onChange={setFilterSubjects}
            label="Subjects"
          />
          <div style={{ fontSize: 12, color: retryStatus ? '#b45309' : '#64748b', whiteSpace: 'nowrap' }}>
            {retryStatus || (loading ? 'Loading…' : `${currChannels.length} channels`)}
          </div>
        </div>
      </div>

      {error && (
        <ErrorBanner error={error} />
      )}

      {/* Executive Briefing */}
      <ExecutiveBriefing
        briefing={briefing}
        loading={briefingLoading}
        error={briefingError}
        onGenerate={fetchBriefing}
        hasData={!!aggCurr}
      />

      {/* Hero KPIs */}
      <HeroKPIStrip current={aggCurr} prior={aggPrior} />

      {/* Daily Growth Chart + Top Movers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
        <DailyGrowthChart
          dailyByChannel={data?.dailyByChannel || []}
          channels={currChannels}
          subjects={SUBJECTS}
        />
        <TopMoversPanel
          topGainers={topGainers}
          topLosers={topLosers}
          topPosts={filteredTopPosts}
          subjects={SUBJECTS}
        />
      </div>

      {/* Recommended Actions */}
      <RecommendedActions briefing={briefing} />
    </div>
  );
}

// ─────────────────────────── sub-components ───────────────────────────

function Header({ range }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>📊 Overview</h1>
      <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
        Executive view of UGC NET Telegram network · {range.preset || 'custom'} range
      </div>
    </div>
  );
}

function ErrorBanner({ error }) {
  return (
    <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
      <strong>Error:</strong> {error}
    </div>
  );
}

function ExecutiveBriefing({ briefing, loading, error, onGenerate, hasData }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      border: '1px solid #93c5fd',
      borderRadius: 12, padding: '14px 16px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: briefing || loading || error ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <strong style={{ fontSize: 14, color: '#0c4a6e' }}>Executive Briefing</strong>
        </div>
        <button onClick={onGenerate} disabled={loading || !hasData} style={{
          background: loading ? '#94a3b8' : '#0c4a6e', color: 'white',
          border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 12,
          fontWeight: 600, cursor: loading || !hasData ? 'not-allowed' : 'pointer',
        }}>
          {loading ? 'Analyzing…' : briefing ? '↻ Regenerate' : '✨ Generate briefing'}
        </button>
      </div>

      {!briefing && !loading && !error && (
        <div style={{ fontSize: 13, color: '#075985', lineHeight: 1.6 }}>
          Get a leadership-style summary of network health, biggest wins, and biggest concerns — based on real Telegram data for the selected date range.
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 12, color: '#075985' }}>Generating briefing from {fmtNum(25)} channel datasets… ~8s</div>
      )}

      {error && (
        <div style={{ background: '#fff', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#991b1b' }}>
          <strong>Couldn't generate briefing:</strong> {error}
        </div>
      )}

      {briefing && (
        <div style={{ background: 'white', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#0f172a', lineHeight: 1.7 }}>
          {briefing.briefing}
        </div>
      )}
    </div>
  );
}

function HeroKPIStrip({ current, prior }) {
  if (!current) return null;
  const items = [
    { label: 'Subscribers',   value: fmtNum(current.subs),    delta: deltaPct(current.subs, prior?.subs),    invert: false, tip: 'Total subscribers across selected channels (current)' },
    { label: 'Joined',        value: fmtNum(current.joined),  delta: deltaPct(current.joined, prior?.joined), invert: false, tip: 'New followers in the period — ground truth from Telegram broadcast stats' },
    { label: 'Left',          value: fmtNum(current.lost),    delta: deltaPct(current.lost, prior?.lost),    invert: true,  tip: 'Followers who left in the period. Lower is better — delta inverted (down arrow = improvement).' },
    { label: 'Net Growth',    value: fmtSigned(current.net),  delta: deltaPct(current.net, prior?.net),      invert: false, tip: 'Joined − Left during the period' },
    { label: 'Total Views',   value: fmtNum(current.views),   delta: deltaPct(current.views, prior?.views),  invert: false, tip: 'Total views across all posts in the period' },
    { label: 'Avg Engagement', value: fmtPct(current.avgEng, 2), delta: deltaPct(current.avgEng, prior?.avgEng), invert: false, tip: 'Mean engagement % across channels: (forwards+reactions+replies)/views' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', gap: 10, marginBottom: 14 }}>
      {items.map((it) => <HeroKPI key={it.label} {...it} />)}
    </div>
  );
}

function HeroKPI({ label, value, delta, invert, tip }) {
  const [showTip, setShowTip] = useState(false);
  // For "Left" we invert the color: down = good (green), up = bad (red)
  const isPositive = delta === null ? null : (invert ? delta < 0 : delta > 0);
  const isZero     = delta !== null && Math.abs(delta) < 0.5;
  const color = isZero ? '#94a3b8' : isPositive ? '#15803d' : '#dc2626';
  const arrow = isZero ? '→' : isPositive ? '↑' : '↓';

  return (
    <div style={{
      background: 'white', borderRadius: 10, padding: '12px 14px',
      border: '1px solid #e2e8f0', position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          {label}
        </div>
        {tip && (
          <div
            onMouseEnter={() => setShowTip(true)}
            onMouseLeave={() => setShowTip(false)}
            style={{
              width: 14, height: 14, borderRadius: '50%',
              background: '#e2e8f0', color: '#64748b',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'default', fontStyle: 'italic',
              fontFamily: 'Georgia, serif',
              flexShrink: 0,
            }}
          >i</div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color }}>
        {delta === null ? <span style={{ color: '#94a3b8' }}>no prior data</span> : (
          <>{arrow} {Math.abs(delta).toFixed(1)}% <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs prior</span></>
        )}
      </div>

      {showTip && tip && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          right: 0,
          background: '#0f172a',
          color: '#e2e8f0',
          padding: '8px 10px',
          borderRadius: 6,
          fontSize: 11,
          lineHeight: 1.5,
          width: 240,
          boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
          zIndex: 20,
          pointerEvents: 'none',
          fontWeight: 400,
          letterSpacing: 'normal',
          textTransform: 'none',
        }}>
          {tip}
        </div>
      )}
    </div>
  );
}


// ─────────────────────────── Top Movers Panel ───────────────────────────
function TopMoversPanel({ topGainers, topLosers, topPosts, subjects }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <MoverList title="🚀 Top Gainers" items={topGainers} subjects={subjects} type="gainer" />
      <MoverList title="📉 Largest Losses" items={topLosers} subjects={subjects} type="loser" />
      <TopPostsList posts={topPosts} subjects={subjects} />
    </div>
  );
}

function MoverList({ title, items, subjects, type }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>{title}</div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((c, i) => {
            const subj = subjects[c.username] || c.username;
            const isPositive = (c.subsNet || 0) > 0;
            return (
              <a
                key={c.username}
                href={`https://t.me/${c.username}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', borderRadius: 6, background: '#f8fafc',
                  textDecoration: 'none', color: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span style={{ color: '#94a3b8', fontSize: 11, minWidth: 14 }}>{i + 1}.</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{subj}</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>@{c.username}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: isPositive ? '#15803d' : '#dc2626' }}>
                    {fmtSigned(c.subsNet)}
                  </div>
                  <div style={{ fontSize: 9, color: '#94a3b8' }}>
                    +{fmtNum(c.subsGained)} / -{fmtNum(c.subsLost)}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TopPostsList({ posts, subjects }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', marginBottom: 6, textTransform: 'uppercase' }}>🏆 Top Posts in range</div>
      {posts.length === 0 ? (
        <div style={{ fontSize: 12, color: '#94a3b8' }}>—</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {posts.map((p, i) => {
            const subj = subjects[p.chatUsername] || p.chatUsername;
            const typeColor = POST_TYPE_COLORS[p.postType] || '#64748b';
            return (
              <a
                key={`${p.chatUsername}-${p.messageId}`}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                  padding: '6px 8px', borderRadius: 6, background: '#f8fafc',
                  textDecoration: 'none', color: '#0f172a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                  <span style={{ color: '#94a3b8', fontSize: 11 }}>{i + 1}.</span>
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>{subj}</span>
                    {p.preview && (
                      <span style={{ fontSize: 10, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>
                        {p.preview}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6' }}>{fmtNum(p.views)}</div>
                  <span style={{ background: typeColor + '22', color: typeColor, padding: '1px 5px', borderRadius: 8, fontSize: 9, fontWeight: 700 }}>
                    {p.postType}
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────── Recommended Actions ───────────────────────────
function RecommendedActions({ briefing }) {
  if (!briefing?.actions || briefing.actions.length === 0) return null;
  const PRIORITY_PILL = {
    high:   { bg: '#fee2e2', color: '#991b1b', label: 'HIGH' },
    medium: { bg: '#fef3c7', color: '#92400e', label: 'MED' },
    low:    { bg: '#dbeafe', color: '#1e40af', label: 'LOW' },
  };
  return (
    <div style={{
      background: 'white', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '14px 16px', marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 16 }}>📋</span>
        <strong style={{ fontSize: 14, color: '#0f172a' }}>Recommended Actions</strong>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>this week</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {briefing.actions.map((a, i) => {
          const p = PRIORITY_PILL[a.priority] || PRIORITY_PILL.medium;
          return (
            <div key={i} style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              padding: '8px 10px', background: '#f8fafc', borderRadius: 8,
            }}>
              <span style={{
                background: p.bg, color: p.color, fontSize: 9, fontWeight: 700,
                padding: '3px 7px', borderRadius: 8, letterSpacing: '0.05em',
                minWidth: 38, textAlign: 'center', marginTop: 1, flexShrink: 0,
              }}>{p.label}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: '#0f172a', lineHeight: 1.5 }}>{a.text}</div>
                {Array.isArray(a.channels) && a.channels.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
                    {a.channels.map((u) => (
                      <a
                        key={u}
                        href={`https://t.me/${u}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: '#e2e8f0', color: '#475569',
                          padding: '1px 6px', borderRadius: 10,
                          fontSize: 9, fontWeight: 600, textDecoration: 'none',
                        }}
                      >@{u}</a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
