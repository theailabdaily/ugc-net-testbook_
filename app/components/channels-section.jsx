'use client';
import { useEffect, useMemo, useState } from 'react';
import DateRangePicker, { PRESETS } from './date-range-picker';

// ─────────────────────────── helpers ───────────────────────────
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
  'MCQ Poll': '#3b82f6',
  'Poll': '#3b82f6',
  'YouTube Class': '#dc2626',
  'Link': '#06b6d4',
  'Photo': '#10b981',
  'Document': '#10b981',
  'Video': '#dc2626',
  'Audio': '#8b5cf6',
  'Telegram Link': '#0ea5e9',
  'Message': '#64748b',
};

function fmtNum(n) {
  if (n === null || n === undefined) return '—';
  if (typeof n !== 'number') return n;
  if (n >= 1e7)  return (n / 1e7).toFixed(2)  + 'Cr';
  if (n >= 1e5)  return (n / 1e5).toFixed(2)  + 'L';
  if (n >= 1e3)  return (n / 1e3).toFixed(1)  + 'K';
  return n.toLocaleString('en-IN');
}

function fmtPct(n, decimals = 1) {
  if (n === null || n === undefined) return '—';
  return n.toFixed(decimals) + '%';
}

function fmtDelta(n) {
  if (n === null || n === undefined) return '—';
  if (n === 0) return '0';
  return (n > 0 ? '+' : '') + n.toLocaleString('en-IN');
}

function fmtAgo(hours) {
  if (hours === null || hours === undefined) return '—';
  if (hours < 1)  return Math.round(hours * 60) + 'm';
  if (hours < 24) return hours.toFixed(1) + 'h';
  return Math.floor(hours / 24) + 'd';
}

function fmtIstHour(h) {
  if (h === null || h === undefined) return '—';
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

function statusPill(status) {
  switch (status) {
    case 'active': return { label: '✅ Active',  bg: '#dcfce7', color: '#15803d' };
    case 'quiet':  return { label: '⚠️ Quiet',   bg: '#fef3c7', color: '#92400e' };
    case 'silent': return { label: '🔴 Silent',  bg: '#fee2e2', color: '#991b1b' };
    default:       return { label: '— No posts', bg: '#f1f5f9', color: '#64748b' };
  }
}

// Cell color scale — heatmap for one column (numeric)
function heat(value, min, max, palette = 'green') {
  if (value === null || value === undefined || !isFinite(value) || max === min) return 'transparent';
  const pct = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const alpha = 0.08 + pct * 0.45;
  const color = palette === 'red'
    ? `rgba(239, 68, 68, ${alpha})`
    : palette === 'blue'
    ? `rgba(59, 130, 246, ${alpha})`
    : `rgba(34, 197, 94, ${alpha})`;
  return color;
}

// ─────────────────────────── columns ───────────────────────────
const COLS = [
  { key: 'channel',        label: 'Channel',       sortable: false, accessor: (c) => c.username, sticky: true,
    tip: 'Click row to expand for KPIs + content type breakdown + actions' },
  { key: 'subscribers',    label: 'Subs',          sortable: true,  accessor: (c) => c.subscribers,        align: 'right',
    tip: 'Current subscriber count (latest meta snapshot)' },
  { key: 'subsGained',     label: 'Gained',        sortable: true,  accessor: (c) => c.subsGained,         align: 'right',
    tip: 'Subs gained in range. Sum of all positive deltas between consecutive snapshots. Sparse until 7+ days of snapshots accumulate.' },
  { key: 'subsLost',       label: 'Lost',          sortable: true,  accessor: (c) => c.subsLost,           align: 'right',
    tip: 'Subs lost (left or were removed) in range. Sum of negative deltas. Same data accumulation caveat as Gained.' },
  { key: 'notifPct',       label: 'Notif %',       sortable: true,  accessor: (c) => c.notifPct,           align: 'right',
    tip: '% of subscribers with notifications ON. The stickiness metric — high = engaged audience, low = many silent followers.' },
  { key: 'posts',          label: 'Posts',         sortable: true,  accessor: (c) => c.postsLive,          align: 'right',
    tip: 'Live posts (excludes deleted) in range' },
  { key: 'avgViews',       label: 'Avg Views',     sortable: true,  accessor: (c) => c.avgViews,           align: 'right',
    tip: 'Average views per live post in range. CAUTION: older posts had more time to accumulate views.' },
  { key: 'engagementRate', label: 'Eng. %',        sortable: true,  accessor: (c) => c.engagementRate,     align: 'right',
    tip: '(Forwards + Reactions + Replies) / Total Views × 100. Quality signal. Above 0.5% = strong; below 0.15% = passive audience.' },
  { key: 'topPostViews',   label: 'Top Post',      sortable: true,  accessor: (c) => c.topPostViews,       align: 'right',
    tip: 'Views on the best-performing post in range. Click to open the post.' },
  { key: 'bestHour',       label: 'Best Hr',       sortable: true,  accessor: (c) => c.bestHour,           align: 'right',
    tip: 'Hour of day (IST) when this channel\u2019s posts get the highest avg views. Requires \u22653 posts at that hour.' },
  { key: 'topContentType', label: 'Top Type',      sortable: false, accessor: (c) => c.topContentType,     align: 'left',
    tip: 'Content type with the highest total views in range' },
  { key: 'hoursSinceLastPost', label: 'Last Post', sortable: true,  accessor: (c) => c.hoursSinceLastPost, align: 'right',
    tip: 'Time since most recent post in range' },
  { key: 'status',         label: 'Status',        sortable: true,  accessor: (c) => c.status,             align: 'center',
    tip: 'Active = last post <24h. Quiet = 24\u201348h. Silent = >48h.' },
];

// ─────────────────────────── component ───────────────────────────
export default function ChannelsSection() {
  const [range, setRange]       = useState(() => ({ ...PRESETS.last30d(), preset: 'last30d' }));
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [search, setSearch]     = useState('');
  const [filterSubj, setFilterSubj] = useState('All');
  const [sortBy, setSortBy]     = useState('subscribers');
  const [sortDir, setSortDir]   = useState('desc');
  const [expanded, setExpanded] = useState(null);

  // Insights state
  const [insights, setInsights]           = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError]     = useState(null);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/channel-metrics?from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (!d.ok) { setError(d.error || 'unknown'); setData(null); }
        else       { setData(d); setError(null); }
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range.from, range.to]);

  // Reset insights whenever range changes — they're range-specific
  useEffect(() => { setInsights(null); setInsightsError(null); }, [range.from, range.to]);

  const fetchInsights = async () => {
    if (!data?.channels || data.channels.length === 0) return;
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const res  = await fetch('/api/channel-insights', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ channels: data.channels, range }),
      });
      const json = await res.json();
      if (json.ok) setInsights(json.insights);
      else         setInsightsError(json.error || 'failed');
    } catch (e) {
      setInsightsError(e.message);
    } finally {
      setInsightsLoading(false);
    }
  };

  const channels = data?.channels || [];

  // Subject filter options
  const subjects = useMemo(() => {
    const all = new Set(['All']);
    channels.forEach((c) => all.add(SUBJECTS[c.username] || c.username));
    return Array.from(all);
  }, [channels]);

  // Apply search + subject filter + sort
  const filtered = useMemo(() => {
    let rows = channels.filter((c) => {
      const subj = SUBJECTS[c.username] || c.username;
      if (filterSubj !== 'All' && subj !== filterSubj) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.username.toLowerCase().includes(q) && !subj.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const col = COLS.find((c) => c.key === sortBy);
    if (col) {
      rows = [...rows].sort((a, b) => {
        const va = col.accessor(a);
        const vb = col.accessor(b);
        // Nulls sink to the bottom regardless of sort direction
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        if (typeof va === 'string') {
          return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
        }
        return sortDir === 'asc' ? va - vb : vb - va;
      });
    }
    return rows;
  }, [channels, search, filterSubj, sortBy, sortDir]);

  // Min/max for heatmap
  const ranges = useMemo(() => {
    const r = {};
    for (const col of COLS) {
      if (col.align !== 'right') continue;
      const vals = filtered.map(col.accessor).filter((v) => v !== null && v !== undefined && isFinite(v));
      r[col.key] = { min: Math.min(...vals, 0), max: Math.max(...vals, 0) };
    }
    return r;
  }, [filtered]);

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortDir('desc');
    }
  };

  // Totals row
  const totals = useMemo(() => {
    if (!filtered.length) return null;
    return {
      subscribers:    filtered.reduce((s, c) => s + (c.subscribers || 0), 0),
      subsGained:     filtered.reduce((s, c) => s + (c.subsGained || 0), 0),
      subsLost:       filtered.reduce((s, c) => s + (c.subsLost || 0), 0),
      posts:          filtered.reduce((s, c) => s + (c.postsLive || 0), 0),
      totalViews:     filtered.reduce((s, c) => s + (c.totalViews || 0), 0),
      totalForwards:  filtered.reduce((s, c) => s + (c.totalForwards || 0), 0),
      totalReactions: filtered.reduce((s, c) => s + (c.totalReactions || 0), 0),
    };
  }, [filtered]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0 }}>📢 Channels</h1>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {channels.length} channels · metrics from real Telegram data
          {data?.dataFreshness?.latestPostCreatedAt && (
            <> · data refreshed {fmtAgo((Date.now() - new Date(data.dataFreshness.latestPostCreatedAt).getTime()) / 3600000)} ago</>
          )}
        </div>
      </div>

      {/* Date range picker */}
      <div style={{ marginBottom: 12 }}>
        <DateRangePicker value={range} onChange={setRange} />
      </div>

      {/* Search + subject filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search channels..."
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', width: 220 }}
        />
        <select
          value={filterSubj}
          onChange={(e) => setFilterSubj(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: 'white' }}
        >
          {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
          {loading ? 'Loading…' : `${filtered.length} channels`}
        </div>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 12 }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* AI Insights panel */}
      <InsightsPanel
        insights={insights}
        loading={insightsLoading}
        error={insightsError}
        collapsed={insightsCollapsed}
        onToggle={() => setInsightsCollapsed((c) => !c)}
        onGenerate={fetchInsights}
        onChannelClick={(u) => { setExpanded(u); document.getElementById('ch-row-' + u)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }}
        rangeLabel={range.preset || 'custom'}
      />

      {/* "How to read" mini help */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: 11, color: '#475569', marginBottom: 12, lineHeight: 1.6 }}>
        💡 <strong>How to read:</strong> Sort by any column · Hover headers for definitions · Click a row to expand details · Numbers shaded as heatmaps (greener = higher) · Notif % is your audience stickiness (engaged vs muted)
      </div>

      {/* Table */}
      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1400, fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {COLS.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => c.sortable && handleSort(c.key)}
                    title={c.tip || ''}
                    style={{
                      padding: '10px 12px',
                      textAlign: c.align || 'left',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      letterSpacing: '0.03em',
                      cursor: c.sortable ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                      position: c.sticky ? 'sticky' : 'static',
                      left: c.sticky ? 0 : undefined,
                      background: c.sticky ? '#f8fafc' : undefined,
                      zIndex: c.sticky ? 2 : undefined,
                    }}
                  >
                    {c.label}
                    {c.sortable && sortBy === c.key && (
                      <span style={{ marginLeft: 4, color: '#0f172a' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={COLS.length} style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>No channels match filters.</td></tr>
              )}
              {filtered.map((ch) => {
                const isExp = expanded === ch.username;
                const pill  = statusPill(ch.status);
                const subj  = SUBJECTS[ch.username] || ch.username;
                return (
                  <>
                    <tr
                      id={'ch-row-' + ch.username}
                      key={ch.username}
                      onClick={() => setExpanded(isExp ? null : ch.username)}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: isExp ? '#fffbeb' : 'white',
                      }}
                    >
                      <td style={{
                        padding: '10px 12px',
                        position: 'sticky', left: 0, background: isExp ? '#f8fafc' : 'white', zIndex: 1,
                        borderRight: '1px solid #f1f5f9',
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                            {isExp ? '▼' : '▶'} {subj}
                            {ch.isVerified && <span style={{ marginLeft: 6, color: '#3b82f6' }}>✓</span>}
                          </div>
                          <a
                            href={`https://t.me/${ch.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ fontSize: 10, color: '#3b82f6', textDecoration: 'none' }}
                          >
                            @{ch.username} ↗
                          </a>
                        </div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, background: heat(ch.subscribers, ranges.subscribers?.min, ranges.subscribers?.max) }}>
                        {fmtNum(ch.subscribers)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803d', fontWeight: 600 }}>
                        {ch.subsGained > 0 ? '+' + fmtNum(ch.subsGained) : ch.subsGained === 0 ? '0' : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626', fontWeight: 600 }}>
                        {ch.subsLost > 0 ? '-' + fmtNum(ch.subsLost) : ch.subsLost === 0 ? '0' : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', background: heat(ch.notifPct, 55, 80) }}>
                        {fmtPct(ch.notifPct)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', background: heat(ch.postsLive, ranges.posts?.min, ranges.posts?.max) }}>
                        {fmtNum(ch.postsLive)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', background: heat(ch.avgViews, ranges.avgViews?.min, ranges.avgViews?.max) }}>
                        {fmtNum(ch.avgViews)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', background: heat(ch.engagementRate, 0, 5) }}>
                        {fmtPct(ch.engagementRate, 2)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {ch.topPostUrl ? (
                          <a href={ch.topPostUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>
                            {fmtNum(ch.topPostViews)} ↗
                          </a>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {fmtIstHour(ch.bestHour)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'left' }}>
                        {ch.topContentType ? (
                          <span style={{
                            background: (POST_TYPE_COLORS[ch.topContentType] || '#64748b') + '22',
                            color: POST_TYPE_COLORS[ch.topContentType] || '#64748b',
                            padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
                          }}>{ch.topContentType}</span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        {fmtAgo(ch.hoursSinceLastPost)}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span style={{ background: pill.bg, color: pill.color, padding: '3px 9px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {pill.label}
                        </span>
                      </td>
                    </tr>

                    {/* Expanded row */}
                    {isExp && (
                      <tr key={ch.username + '-exp'} style={{ background: '#f8fafc' }}>
                        <td colSpan={COLS.length} style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                          <ExpandedDetails ch={ch} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {totals && (
                <tr style={{ background: '#f1f5f9', fontWeight: 700, borderTop: '2px solid #cbd5e1' }}>
                  <td style={{ padding: '10px 12px', position: 'sticky', left: 0, background: '#f1f5f9', zIndex: 1 }}>
                    TOTAL ({filtered.length})
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtNum(totals.subscribers)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#15803d' }}>{totals.subsGained ? '+' + fmtNum(totals.subsGained) : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', color: '#dc2626' }}>{totals.subsLost ? '-' + fmtNum(totals.subsLost) : '—'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>{fmtNum(totals.posts)}</td>
                  <td colSpan={6} style={{ padding: '10px 12px', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                    Net subs change: <strong style={{ color: (totals.subsGained - totals.subsLost) >= 0 ? '#15803d' : '#dc2626' }}>
                      {fmtDelta(totals.subsGained - totals.subsLost)}
                    </strong>
                    {' · '}Total views: {fmtNum(totals.totalViews)}
                    {' · '}Forwards: {fmtNum(totals.totalForwards)}
                    {' · '}Reactions: {fmtNum(totals.totalReactions)}
                  </td>
                  <td style={{ padding: '10px 12px' }} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer with data freshness */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 10, lineHeight: 1.5 }}>
        Range: {new Date(range.from).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
        {' → '}
        {new Date(range.to).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}
        {' IST'}
        {data?.dataFreshness?.latestMetaCapturedAt && (
          <> · Channel metadata captured: {new Date(data.dataFreshness.latestMetaCapturedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── expanded row ───────────────────────────
function ExpandedDetails({ ch }) {
  const breakdown = ch.contentTypeBreakdown
    ? Object.entries(ch.contentTypeBreakdown)
        .sort((a, b) => (b[1].totalViews || 0) - (a[1].totalViews || 0))
    : [];

  const KPI = ({ label, value, sub, color }) => (
    <div style={{ background: 'white', borderRadius: 8, padding: '10px 12px', minWidth: 130 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: color || '#0f172a', marginTop: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <KPI label="Subscribers"      value={fmtNum(ch.subscribers)} sub={`${ch.notifOnCount ? fmtNum(ch.notifOnCount) + ' notif on' : ''}`} />
        <KPI label="Notif Enabled %"  value={fmtPct(ch.notifPct)}    sub={ch.notifPct ? `${(100 - ch.notifPct).toFixed(1)}% muted` : ''} color="#0f172a" />
        <KPI label="Admins"           value={fmtNum(ch.adminsCount)} />
        <KPI label="Kicked"           value={fmtNum(ch.kickedCount)} />
        <KPI label="Banned"           value={fmtNum(ch.bannedCount)} />
        <KPI label="Posts in range"   value={fmtNum(ch.postsLive)}   sub={ch.postsDeleted > 0 ? `${ch.postsDeleted} deleted` : ''} />
        <KPI label="Posts pinned"     value={fmtNum(ch.postsPinned)} />
        <KPI label="Posts edited"     value={fmtNum(ch.postsEdited)} />
        <KPI label="Total Views"      value={fmtNum(ch.totalViews)} />
        <KPI label="Total Forwards"   value={fmtNum(ch.totalForwards)} />
        <KPI label="Total Reactions"  value={fmtNum(ch.totalReactions)} />
        <KPI label="Engagement Rate"  value={fmtPct(ch.engagementRate, 2)} sub="(fwds+react+replies)/views" />
      </div>

      {/* Content type breakdown */}
      {breakdown.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', marginBottom: 8 }}>
            CONTENT TYPE BREAKDOWN (in range)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {breakdown.map(([type, data]) => {
              const totalTypeViews = breakdown.reduce((s, [, d]) => s + (d.totalViews || 0), 0);
              const pct = totalTypeViews ? ((data.totalViews || 0) / totalTypeViews) * 100 : 0;
              const color = POST_TYPE_COLORS[type] || '#64748b';
              return (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ minWidth: 130, fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{type}</div>
                  <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: pct + '%', height: '100%', background: color }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', minWidth: 200, textAlign: 'right' }}>
                    {fmtNum(data.count)} posts · {fmtNum(data.totalViews)} views · {pct.toFixed(1)}% share
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Channel description */}
      {ch.description && (
        <div style={{ background: 'white', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#475569', lineHeight: 1.6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em', marginBottom: 4 }}>
            DESCRIPTION
          </div>
          {ch.description}
        </div>
      )}

      {/* Action links */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={`https://t.me/${ch.username}`} target="_blank" rel="noopener noreferrer"
           style={{ padding: '6px 12px', borderRadius: 6, background: '#0f172a', color: 'white', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          Open channel ↗
        </a>
        {ch.topPostUrl && (
          <a href={ch.topPostUrl} target="_blank" rel="noopener noreferrer"
             style={{ padding: '6px 12px', borderRadius: 6, background: 'white', color: '#3b82f6', border: '1px solid #93c5fd', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            Top post ({fmtNum(ch.topPostViews)} views) ↗
          </a>
        )}
        {ch.inviteLink && (
          <a href={ch.inviteLink} target="_blank" rel="noopener noreferrer"
             style={{ padding: '6px 12px', borderRadius: 6, background: 'white', color: '#475569', border: '1px solid #cbd5e1', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            Invite link ↗
          </a>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────── AI Insights Panel ───────────────────────────
function InsightsPanel({ insights, loading, error, collapsed, onToggle, onGenerate, onChannelClick, rangeLabel }) {
  const CATEGORY_META = {
    Opportunity:    { color: '#15803d', bg: '#dcfce7', border: '#86efac' },
    Anomaly:        { color: '#b45309', bg: '#fef3c7', border: '#fcd34d' },
    Recommendation: { color: '#0369a1', bg: '#dbeafe', border: '#93c5fd' },
    Pattern:        { color: '#7c3aed', bg: '#ede9fe', border: '#c4b5fd' },
  };
  const SEVERITY_PILL = {
    high:   { bg: '#fee2e2', color: '#991b1b', label: 'HIGH' },
    medium: { bg: '#fef3c7', color: '#92400e', label: 'MED' },
    low:    { bg: '#f1f5f9', color: '#475569', label: 'LOW' },
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #fef9c3 0%, #fde68a 100%)',
      border: '1px solid #fcd34d',
      borderRadius: 12,
      padding: '14px 16px',
      marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: insights || loading ? 10 : 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>AI Insights</strong>
          <span style={{ fontSize: 11, color: '#92400e' }}>({rangeLabel})</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(insights || error) && (
            <button onClick={onToggle} style={{
              background: 'transparent', border: '1px solid #92400e80', color: '#92400e',
              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}>{collapsed ? '▼ Show' : '▲ Hide'}</button>
          )}
          <button onClick={onGenerate} disabled={loading} style={{
            background: loading ? '#94a3b8' : '#0f172a', color: 'white',
            border: 'none', padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}>
            {loading ? 'Analyzing…' : (insights ? '↻ Regenerate' : '✨ Generate insights')}
          </button>
        </div>
      </div>

      {!insights && !loading && !error && (
        <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.6 }}>
          Get a Claude-powered briefing on this date range: which channels need attention, what's working, what to do this week. Specific channels named, specific numbers cited.
        </div>
      )}

      {loading && (
        <div style={{ fontSize: 12, color: '#92400e' }}>Reading all 25 channels and crafting recommendations… ~10s</div>
      )}

      {error && (
        <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#991b1b' }}>
          <strong>Couldn't generate insights:</strong> {error}
        </div>
      )}

      {insights && !collapsed && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
          {insights.map((ins, i) => {
            const cat = CATEGORY_META[ins.category] || CATEGORY_META.Pattern;
            const sev = SEVERITY_PILL[ins.severity] || SEVERITY_PILL.medium;
            return (
              <div key={i} style={{
                background: 'white',
                borderLeft: `3px solid ${cat.color}`,
                borderRadius: 6,
                padding: '10px 12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 14 }}>{ins.icon || '💡'}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: cat.color, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {ins.category}
                    </span>
                  </div>
                  <span style={{ background: sev.bg, color: sev.color, fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 8, letterSpacing: '0.05em' }}>
                    {sev.label}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginTop: 4 }}>
                  {ins.title}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>
                  {ins.detail}
                </div>
                {Array.isArray(ins.channels) && ins.channels.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                    {ins.channels.map((u) => (
                      <button
                        key={u}
                        onClick={() => onChannelClick && onChannelClick(u.toLowerCase())}
                        style={{
                          background: '#f1f5f9', color: '#475569',
                          border: 'none', padding: '2px 7px', borderRadius: 10,
                          fontSize: 10, fontWeight: 600, cursor: 'pointer',
                        }}
                      >@{u}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
