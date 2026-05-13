'use client';
import { useEffect, useMemo, useState } from 'react';
import DateRangePicker, { PRESETS } from './date-range-picker';
import SubjectMultiSelect, { applySubjectFilter } from './subject-multiselect';

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/overview-metrics?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) { setError(d.error || 'unknown'); setData(null); }
        else { setData(d); setError(null); }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
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
      const res = await fetch('/api/portfolio-insights', {
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
          <div style={{ fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
            {loading ? 'Loading…' : `${currChannels.length} channels`}
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

      {/* Quadrant + Top Movers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 14, marginBottom: 14 }}>
        <PortfolioQuadrant channels={currChannels} subjects={SUBJECTS} />
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
  // For "Left" we invert the color: down = good (green), up = bad (red)
  const isPositive = delta === null ? null : (invert ? delta < 0 : delta > 0);
  const isZero     = delta !== null && Math.abs(delta) < 0.5;
  const color = isZero ? '#94a3b8' : isPositive ? '#15803d' : '#dc2626';
  const arrow = isZero ? '→' : isPositive ? '↑' : '↓';

  return (
    <div title={tip} style={{
      background: 'white', borderRadius: 10, padding: '12px 14px',
      border: '1px solid #e2e8f0', cursor: 'help',
    }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', marginTop: 4, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600, color }}>
        {delta === null ? <span style={{ color: '#94a3b8' }}>no prior data</span> : (
          <>{arrow} {Math.abs(delta).toFixed(1)}% <span style={{ color: '#94a3b8', fontWeight: 500 }}>vs prior</span></>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── Portfolio Quadrant (SVG) ───────────────────────────
function PortfolioQuadrant({ channels, subjects }) {
  if (!channels || channels.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 18 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Portfolio Quadrant</h3>
        <div style={{ marginTop: 30, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>No channels in current filter.</div>
      </div>
    );
  }

  const W = 520, H = 400, PAD = 50;

  // X: net growth %, Y: engagement %
  const points = channels
    .filter((c) => c.growthPct !== null && c.engagementRate !== null && c.subscribers)
    .map((c) => ({
      username: c.username,
      subject: subjects[c.username] || c.username,
      x: c.growthPct,
      y: c.engagementRate,
      subs: c.subscribers,
    }));

  if (points.length === 0) {
    return (
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 18 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Portfolio Quadrant</h3>
        <div style={{ marginTop: 30, color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>
          Not enough data to plot. Need channels with both growth % and engagement % computed.
        </div>
      </div>
    );
  }

  // Symmetric clamp on X so outliers don't squish the cluster
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMax = Math.max(Math.abs(Math.min(...xs)), Math.abs(Math.max(...xs)), 5);
  const xMin = -xMax;
  const yMax = Math.max(...ys, 1);
  const yMin = 0;

  // Use median split for quadrant lines instead of zero, so quadrants are population-aware
  const median = (arr) => { const s = [...arr].sort((a,b)=>a-b); const m=s.length>>1; return s.length%2?s[m]:(s[m-1]+s[m])/2; };
  const xMid = median(xs);
  const yMid = median(ys);

  const xScale = (v) => PAD + ((v - xMin) / (xMax - xMin)) * (W - 2 * PAD);
  const yScale = (v) => H - PAD - ((v - yMin) / (yMax - yMin)) * (H - 2 * PAD);
  const subsToR = (s) => 4 + Math.sqrt(s / 100); // gentle scaling

  return (
    <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', padding: 16, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0f172a' }}>Portfolio Quadrant</h3>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>Growth × Engagement · bubble = subs</div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* Quadrant background tints */}
        <rect x={xScale(xMid)} y={PAD}             width={W - PAD - xScale(xMid)} height={yScale(yMid) - PAD}        fill="#f0fdf4" />
        <rect x={PAD}          y={PAD}             width={xScale(xMid) - PAD}     height={yScale(yMid) - PAD}        fill="#fefce8" />
        <rect x={xScale(xMid)} y={yScale(yMid)}    width={W - PAD - xScale(xMid)} height={H - PAD - yScale(yMid)}    fill="#eff6ff" />
        <rect x={PAD}          y={yScale(yMid)}    width={xScale(xMid) - PAD}     height={H - PAD - yScale(yMid)}    fill="#fef2f2" />

        {/* Axes */}
        <line x1={PAD}         y1={H - PAD}        x2={W - PAD}      y2={H - PAD}        stroke="#cbd5e1" strokeWidth="1" />
        <line x1={PAD}         y1={PAD}            x2={PAD}          y2={H - PAD}        stroke="#cbd5e1" strokeWidth="1" />

        {/* Mid lines */}
        <line x1={xScale(xMid)} y1={PAD}            x2={xScale(xMid)} y2={H - PAD}        stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={PAD}          y1={yScale(yMid)}   x2={W - PAD}      y2={yScale(yMid)}   stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3" />

        {/* Quadrant labels */}
        <text x={W - PAD - 8} y={PAD + 14} textAnchor="end" fontSize="10" fontWeight="700" fill="#15803d">★ STARS</text>
        <text x={PAD + 8}     y={PAD + 14} textAnchor="start" fontSize="10" fontWeight="700" fill="#a16207">CULT FAVS</text>
        <text x={W - PAD - 8} y={H - PAD - 8} textAnchor="end" fontSize="10" fontWeight="700" fill="#1d4ed8">HOLLOW GROWTH</text>
        <text x={PAD + 8}     y={H - PAD - 8} textAnchor="start" fontSize="10" fontWeight="700" fill="#b91c1c">AT RISK</text>

        {/* Axis labels */}
        <text x={W / 2}        y={H - 12} textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">Net Growth % →</text>
        <text x={14}           y={H / 2} textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600" transform={`rotate(-90, 14, ${H / 2})`}>
          Engagement % →
        </text>

        {/* Axis tick values */}
        <text x={PAD}          y={H - PAD + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">{xMin.toFixed(0)}%</text>
        <text x={W - PAD}      y={H - PAD + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">+{xMax.toFixed(0)}%</text>
        <text x={PAD - 6}      y={PAD + 4} textAnchor="end" fontSize="9" fill="#94a3b8">{yMax.toFixed(1)}%</text>
        <text x={PAD - 6}      y={H - PAD + 4} textAnchor="end" fontSize="9" fill="#94a3b8">0%</text>

        {/* Bubbles */}
        {points.map((p) => (
          <g key={p.username}>
            <circle
              cx={xScale(p.x)}
              cy={yScale(p.y)}
              r={subsToR(p.subs)}
              fill="#3b82f6"
              fillOpacity="0.45"
              stroke="#1d4ed8"
              strokeWidth="1"
            >
              <title>{p.subject} (@{p.username}) — {fmtNum(p.subs)} subs · {p.x.toFixed(1)}% growth · {p.y.toFixed(2)}% eng</title>
            </circle>
          </g>
        ))}
      </svg>
      <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6, lineHeight: 1.6 }}>
        <strong>Quadrants split at network median.</strong> ★ Stars = growing AND engaged · Cult favs = small but rabid · Hollow growth = acquiring but disengaged · At risk = neither. Hover bubbles for details.
      </div>
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
