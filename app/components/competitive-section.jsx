'use client';
import { useEffect, useMemo, useState } from 'react';

// ──────────────────────────── Subject mapping (mirrors content-calendar / overview) ────────────────────────────
const SUBJECTS = {
  testbook_ugcnet:       'Common',
  pritipaper1:           'Paper 1',  // teacher = Priti
  tulikamam:             'Paper 1',  // teacher = Tulika
  anshikamaamtestbook:   'Paper 1',  // teacher = Anshika
  testbookrajatsir:      'Paper 1',  // teacher = Rajat
  pradyumansir_testbook: 'Political Science',
  ashwanisir_testbook:   'History',
  kiranmaamtestbook:     'Public Administration',
  manojsonker_testbook:  'Sociology',
  heenamaam_testbook:    'Education',
  aditimaam_testbook:    'Home Science',
  karansir_testbook:     'Law',
  testbookdakshita:      'English',
  ashishsir_testbook:    'Geography',
  shachimaam_testbook:   'Economics',
  monikamaamtestbook:    'Management',
  yogitamaamtestbook:    'Management',
  evs_anshikamaamtestbook: 'Environmental Science',
  daminimaam_testbook:   'Library Science',
  testbookshahna:        'Computer Science',
  prakashsirtestbook:    'Sanskrit',
  kesharisir_testbook:   'Hindi',
  testbookniharikamaam:  'Commerce',
  mrinalinimaam_testbook:'Psychology',
  testbook_gauravsir:    'Physical Education',
};

const fmtNum = (n) => {
  if (n == null) return '—';
  const a = Math.abs(n);
  if (a >= 1e7) return (n / 1e7).toFixed(2) + 'Cr';
  if (a >= 1e5) return (n / 1e5).toFixed(2) + 'L';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('en-IN');
};
const fmtFull   = (n) => (n == null ? '—' : Math.round(n).toLocaleString('en-IN'));
const fmtSigned = (n) => (n == null ? '—' : (n > 0 ? '+' : '') + fmtNum(n));
const fmtPct    = (n) => (n == null ? '—' : (n > 0 ? '+' : '') + n.toFixed(1) + '%');

// ──────────────────────────── Section header ────────────────────────────
function Header({ data, onRefresh, refreshing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          ⚔️ Competitive Intelligence
        </h2>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
          {data?.meta?.total_competitors_in_registry || 0} competitors tracked · {data?.meta?.days_of_history || 0} days of history
          {data?.today_ist && ` · as of ${data.today_ist}`}
        </div>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: refreshing ? 'wait' : 'pointer' }}
      >
        {refreshing ? '⟳ Refreshing…' : '↻ Refresh snapshots'}
      </button>
    </div>
  );
}

// ──────────────────────────── Hero metrics strip ────────────────────────────
function HeroStrip({ competitors, ours, meta }) {
  const stats = useMemo(() => {
    // Aggregate per-subject leadership
    const subjectStandings = {};
    for (const c of competitors) {
      if (!subjectStandings[c.subject]) subjectStandings[c.subject] = { ours: 0, theirs: 0, top: null };
      if (c.subs > subjectStandings[c.subject].theirs) {
        subjectStandings[c.subject].theirs = c.subs;
        subjectStandings[c.subject].top = c;
      }
    }
    for (const o of ours) {
      const subj = SUBJECTS[o.username] || 'Unknown';
      if (!subjectStandings[subj]) subjectStandings[subj] = { ours: 0, theirs: 0, top: null };
      if (o.subs > subjectStandings[subj].ours) subjectStandings[subj].ours = o.subs;
    }

    const subjects = Object.keys(subjectStandings);
    const leading  = subjects.filter((s) => subjectStandings[s].ours >= subjectStandings[s].theirs && subjectStandings[s].ours > 0).length;
    const tracked  = subjects.length;

    const ourTotal = ours.reduce((s, o) => s + (o.subs || 0), 0);
    const theirTotal = competitors.reduce((s, c) => s + (c.subs || 0), 0);
    const marketShare = (ourTotal + theirTotal) > 0 ? (ourTotal / (ourTotal + theirTotal)) * 100 : 0;

    return { leading, tracked, ourTotal, theirTotal, marketShare };
  }, [competitors, ours]);

  const card = (label, value, sub, color) => (
    <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
      {card('🏆 Subjects we lead', `${stats.leading}/${stats.tracked}`, `${stats.tracked - stats.leading} we trail`, stats.leading >= stats.tracked / 2 ? '#16a34a' : '#dc2626')}
      {card('📊 Our total subs',   fmtNum(stats.ourTotal),  `${ours.length} of our channels`, '#0f172a')}
      {card('⚔️ Competitor total', fmtNum(stats.theirTotal), `${competitors.length} channels`, '#475569')}
      {card('📈 Network share',    stats.marketShare.toFixed(1) + '%', `of tracked space`, '#3b82f6')}
    </div>
  );
}

// ──────────────────────────── Scoreboard tab ────────────────────────────
function Scoreboard({ competitors, ours, hasHistory }) {
  const [sortBy,  setSortBy]  = useState('gap');
  const [sortDir, setSortDir] = useState('asc');  // asc = biggest gap (most behind) first

  // Build per-subject rows
  const rows = useMemo(() => {
    const bySubject = {};
    for (const c of competitors) {
      if (!bySubject[c.subject]) bySubject[c.subject] = { subject: c.subject, ours: [], theirs: [] };
      bySubject[c.subject].theirs.push(c);
    }
    for (const o of ours) {
      const subj = SUBJECTS[o.username] || null;
      if (!subj) continue;
      if (!bySubject[subj]) bySubject[subj] = { subject: subj, ours: [], theirs: [] };
      bySubject[subj].ours.push(o);
    }

    return Object.values(bySubject).map((entry) => {
      const ourBest    = entry.ours.sort((a, b) => b.subs - a.subs)[0]    || null;
      const topComp    = entry.theirs.sort((a, b) => b.subs - a.subs)[0] || null;
      const ourSubs    = ourBest?.subs    || 0;
      const compSubs   = topComp?.subs   || 0;
      const gap        = ourSubs - compSubs;  // positive = we lead
      const isLeading  = gap >= 0 && ourSubs > 0;
      const noData     = compSubs === 0 && ourSubs === 0;

      // Growth comparison
      const ourPct7d  = ourBest?.pct_7d ?? null;
      const compPct7d = topComp?.pct_7d ?? null;
      const velocityGap = (ourPct7d != null && compPct7d != null) ? ourPct7d - compPct7d : null;

      // Status determination
      let status, statusBg, statusFg;
      if (noData) { status = 'No data'; statusBg = '#f1f5f9'; statusFg = '#94a3b8'; }
      else if (isLeading) {
        if (hasHistory && velocityGap != null && velocityGap < -1) { status = 'Leading but slowing'; statusBg = '#fef3c7'; statusFg = '#92400e'; }
        else { status = 'Leading'; statusBg = '#dcfce7'; statusFg = '#15803d'; }
      } else {
        if (hasHistory && velocityGap != null && velocityGap > 1) { status = 'Behind but catching up'; statusBg = '#dbeafe'; statusFg = '#1e40af'; }
        else { status = 'Behind'; statusBg = '#fee2e2'; statusFg = '#991b1b'; }
      }

      return {
        subject:    entry.subject,
        ourBest, topComp, ourSubs, compSubs, gap, isLeading, noData,
        ourPct7d, compPct7d, velocityGap,
        status, statusBg, statusFg,
      };
    });
  }, [competitors, ours, hasHistory]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => {
      let av, bv;
      if (sortBy === 'subject')   { av = a.subject; bv = b.subject; }
      else if (sortBy === 'ours') { av = a.ourSubs; bv = b.ourSubs; }
      else if (sortBy === 'theirs') { av = a.compSubs; bv = b.compSubs; }
      else if (sortBy === 'gap')  { av = a.gap; bv = b.gap; }
      else { av = a.subject; bv = b.subject; }
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return sorted;
  }, [rows, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir(col === 'subject' ? 'asc' : 'desc'); }
  };
  const sortIcon = (col) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const th = (label, col) => (
    <th
      onClick={() => toggleSort(col)}
      style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', userSelect: 'none', background: '#f8fafc' }}
    >
      {label}{sortIcon(col)}
    </th>
  );

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {th('Subject',      'subject')}
            {th('Our best',     'ours')}
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Subs</th>
            {th('Top competitor', 'theirs')}
            <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Subs</th>
            <th onClick={() => toggleSort('gap')} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer' }}>Gap{sortIcon('gap')}</th>
            {hasHistory && <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Our 7d</th>}
            {hasHistory && <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Their 7d</th>}
            <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((r) => (
            <tr key={r.subject} style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 12px', fontWeight: 700, color: '#0f172a' }}>{r.subject}</td>
              <td style={{ padding: '10px 12px', color: '#475569' }}>
                {r.ourBest ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700 }}>OURS</span>
                    {r.ourBest.title || r.ourBest.username}
                  </span>
                ) : <span style={{ color: '#94a3b8' }}>—</span>}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtFull(r.ourSubs)}</td>
              <td style={{ padding: '10px 12px', color: '#475569' }}>
                {r.topComp ? (
                  <a href={`https://t.me/${r.topComp.username}`} target="_blank" rel="noopener noreferrer" style={{ color: '#475569', textDecoration: 'none' }}>
                    {r.topComp.title || r.topComp.username} ↗
                  </a>
                ) : <span style={{ color: '#94a3b8' }}>No competitor</span>}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{fmtFull(r.compSubs)}</td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: r.gap >= 0 ? '#15803d' : '#dc2626' }}>{r.noData ? '—' : fmtSigned(r.gap)}</td>
              {hasHistory && <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (r.ourPct7d ?? 0) >= 0 ? '#15803d' : '#dc2626' }}>{fmtPct(r.ourPct7d)}</td>}
              {hasHistory && <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (r.compPct7d ?? 0) >= 0 ? '#15803d' : '#dc2626' }}>{fmtPct(r.compPct7d)}</td>}
              <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                <span style={{ background: r.statusBg, color: r.statusFg, padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {r.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {sortedRows.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          No subjects to display yet. Run a snapshot capture to populate.
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── Leaderboard tab ────────────────────────────
function Leaderboard({ competitors, ours, hasHistory }) {
  const [limit, setLimit] = useState(20);

  const allEntries = useMemo(() => {
    const list = [
      ...competitors.map((c) => ({ ...c, label: SUBJECTS[c.username.toLowerCase()] ? null : c.subject, is_ours: false })),
      ...ours.map((o) => ({ ...o, label: SUBJECTS[o.username] || null, subject: SUBJECTS[o.username] || 'Ours', is_ours: true })),
    ];
    return list.filter((e) => e.subs > 0).sort((a, b) => b.subs - a.subs);
  }, [competitors, ours]);

  const top = allEntries.slice(0, limit);

  return (
    <div>
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ padding: '10px 12px', textAlign: 'right', width: 60, fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', background: '#f8fafc' }}>#</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', background: '#f8fafc' }}>Channel</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', background: '#f8fafc' }}>Subject</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', background: '#f8fafc' }}>Subscribers</th>
              {hasHistory && <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', background: '#f8fafc' }}>7d Δ</th>}
              {hasHistory && <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#475569', letterSpacing: '0.04em', textTransform: 'uppercase', background: '#f8fafc' }}>7d %</th>}
            </tr>
          </thead>
          <tbody>
            {top.map((e, i) => (
              <tr key={`${e.username}-${i}`} style={{
                borderBottom: '1px solid #f1f5f9',
                background: e.is_ours ? '#f0f9ff' : 'white',
              }}>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: i < 3 ? '#0f172a' : '#94a3b8' }}>
                  {i + 1}{i === 0 ? ' 🥇' : i === 1 ? ' 🥈' : i === 2 ? ' 🥉' : ''}
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <a href={`https://t.me/${e.username}`} target="_blank" rel="noopener noreferrer" style={{ color: '#0f172a', textDecoration: 'none', fontWeight: 600 }}>
                    {e.is_ours && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 6px', borderRadius: 8, fontSize: 9, fontWeight: 700, marginRight: 6 }}>OURS</span>}
                    {e.title || e.username}
                    <span style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 6, fontSize: 11 }}>@{e.username}</span>
                  </a>
                </td>
                <td style={{ padding: '10px 12px', color: '#64748b' }}>{e.subject}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{fmtFull(e.subs)}</td>
                {hasHistory && <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (e.change_7d ?? 0) >= 0 ? '#15803d' : '#dc2626' }}>{fmtSigned(e.change_7d)}</td>}
                {hasHistory && <td style={{ padding: '10px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: (e.pct_7d ?? 0) >= 0 ? '#15803d' : '#dc2626' }}>{fmtPct(e.pct_7d)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allEntries.length > limit && (
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <button onClick={() => setLimit((l) => l + 20)} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>
            Show more (showing {limit} of {allEntries.length})
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── By Subject tab ────────────────────────────
function BySubject({ competitors, ours }) {
  const subjects = useMemo(() => {
    const s = new Set();
    competitors.forEach((c) => s.add(c.subject));
    ours.forEach((o) => { const subj = SUBJECTS[o.username]; if (subj) s.add(subj); });
    return Array.from(s).sort();
  }, [competitors, ours]);

  const [selected, setSelected] = useState(subjects[0] || null);

  useEffect(() => {
    if (!selected && subjects.length) setSelected(subjects[0]);
  }, [subjects, selected]);

  const ourChannels = ours.filter((o) => SUBJECTS[o.username] === selected).sort((a, b) => b.subs - a.subs);
  const theirChannels = competitors.filter((c) => c.subject === selected).sort((a, b) => b.subs - a.subs);

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {subjects.map((s) => (
          <button
            key={s}
            onClick={() => setSelected(s)}
            style={{
              padding: '5px 12px', borderRadius: 16, fontSize: 12, fontWeight: 600,
              border: selected === s ? '1px solid #0f172a' : '1px solid #e2e8f0',
              background: selected === s ? '#0f172a' : 'white',
              color: selected === s ? 'white' : '#475569',
              cursor: 'pointer',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 14 }}>
        <ChannelList title="🛡️ Our channels" channels={ourChannels} accent="#3b82f6" isOurs />
        <ChannelList title="⚔️ Competitor channels" channels={theirChannels} accent="#dc2626" />
      </div>
    </div>
  );
}

function ChannelList({ title, channels, accent, isOurs }) {
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>{title}</strong>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>{channels.length} channels</span>
      </div>
      {channels.length === 0 ? (
        <div style={{ padding: 24, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>No channels tracked in this subject yet.</div>
      ) : (
        <div>
          {channels.map((c) => (
            <a
              key={c.username}
              href={`https://t.me/${c.username}`}
              target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f1f5f9', textDecoration: 'none', color: '#0f172a' }}
            >
              <div style={{ width: 4, height: 32, background: accent, borderRadius: 2 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || c.username}</div>
                <div style={{ fontSize: 10, color: '#94a3b8' }}>@{c.username}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtFull(c.subs)}</div>
                {c.pct_7d != null && (
                  <div style={{ fontSize: 10, color: c.pct_7d >= 0 ? '#15803d' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtPct(c.pct_7d)} 7d
                  </div>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────── Top Movers tab ────────────────────────────
function TopMovers({ competitors, ours }) {
  const all = [
    ...competitors.map((c) => ({ ...c, subject: c.subject, is_ours: false })),
    ...ours.map((o) => ({ ...o, subject: SUBJECTS[o.username] || 'Ours', is_ours: true })),
  ].filter((e) => e.subs > 0);

  const gainers7d  = [...all].filter((e) => e.change_7d != null && e.change_7d > 0).sort((a, b) => b.change_7d - a.change_7d).slice(0, 10);
  const losers7d   = [...all].filter((e) => e.change_7d != null && e.change_7d < 0).sort((a, b) => a.change_7d - b.change_7d).slice(0, 10);
  const fastestPct = [...all].filter((e) => e.pct_7d != null && e.subs >= 1000).sort((a, b) => b.pct_7d - a.pct_7d).slice(0, 10);

  if (gainers7d.length === 0 && losers7d.length === 0) {
    return (
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, padding: 30, textAlign: 'center', color: '#64748b' }}>
        <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Building history…</div>
        <div style={{ fontSize: 12 }}>Top movers needs at least 7 days of snapshots. Check back tomorrow.</div>
      </div>
    );
  }

  const MoverList = ({ title, list, color }) => (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
        <strong style={{ fontSize: 13, color: '#0f172a' }}>{title}</strong>
      </div>
      {list.map((e) => (
        <div key={e.username} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 10, background: e.is_ours ? '#f0f9ff' : 'white' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {e.is_ours && <span style={{ background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: 8, fontSize: 9, fontWeight: 700, marginRight: 4 }}>OURS</span>}
              {e.title || e.username}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8' }}>{e.subject} · @{e.username}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{fmtSigned(e.change_7d)}</div>
            <div style={{ fontSize: 10, color, fontVariantNumeric: 'tabular-nums' }}>{fmtPct(e.pct_7d)}</div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
      <MoverList title="🚀 Top gainers (7d)"     list={gainers7d}  color="#15803d" />
      <MoverList title="📉 Biggest decliners (7d)" list={losers7d}   color="#dc2626" />
      <MoverList title="⚡ Fastest growing %"     list={fastestPct} color="#3b82f6" />
    </div>
  );
}

// ──────────────────────────── Main section ────────────────────────────
export default function CompetitiveSectionV2() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('scoreboard');

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/competitive-intel');
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'load_failed');
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        Loading competitive intel…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 16, borderRadius: 10, fontSize: 13 }}>
        <strong>Error loading competitive data:</strong> {error}
      </div>
    );
  }

  const hasSnapshots = (data?.meta?.total_competitor_snapshots_today || 0) > 0;
  const hasHistory   = data?.meta?.has_7d_history || false;
  const competitors  = data?.competitors || [];
  const ours         = data?.ours || [];

  return (
    <div>
      <Header data={data} onRefresh={refresh} refreshing={refreshing} />

      {!hasSnapshots && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: 14, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          <strong>⚠ No snapshots captured yet today.</strong> Click "Refresh snapshots" above, or wait for the daily cron job at 1 AM IST.
        </div>
      )}

      <HeroStrip competitors={competitors} ours={ours} meta={data?.meta} />

      {/* Tab strip */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 14, borderBottom: '1px solid #e2e8f0' }}>
        {[
          { id: 'scoreboard',  label: '🏆 Scoreboard',   note: '' },
          { id: 'leaderboard', label: '📊 Leaderboard',  note: '' },
          { id: 'by-subject',  label: '📚 By Subject',   note: '' },
          { id: 'movers',      label: '🚀 Top Movers',   note: hasHistory ? '' : ' (needs 7d)' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 14px', border: 'none',
              background: 'transparent',
              color: tab === t.id ? '#0f172a' : '#64748b',
              borderBottom: tab === t.id ? '2px solid #0f172a' : '2px solid transparent',
              fontWeight: tab === t.id ? 700 : 500,
              fontSize: 13,
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}{t.note}
          </button>
        ))}
      </div>

      {tab === 'scoreboard'  && <Scoreboard  competitors={competitors} ours={ours} hasHistory={hasHistory} />}
      {tab === 'leaderboard' && <Leaderboard competitors={competitors} ours={ours} hasHistory={hasHistory} />}
      {tab === 'by-subject'  && <BySubject   competitors={competitors} ours={ours} />}
      {tab === 'movers'      && <TopMovers   competitors={competitors} ours={ours} />}
    </div>
  );
}
