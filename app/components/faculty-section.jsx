'use client';
import { useEffect, useMemo, useState } from 'react';

export default function FacultySection() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [search, setSearch]   = useState('');
  const [savingChan, setSavingChan] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/faculty');
      const d = await r.json();
      if (!d.ok) throw new Error(d.error || 'load_failed');
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function assign(chat_username, faculty_email) {
    setSavingChan(chat_username);
    try {
      const r = await fetch('/api/faculty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_username, faculty_email: faculty_email || null }),
      });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      await load();
    } catch (e) {
      alert('Assignment failed: ' + e.message);
    } finally {
      setSavingChan(null);
    }
  }

  if (loading && !data) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e2e8f0', borderTop: '3px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
        Loading faculty registry…
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: 16, borderRadius: 10, fontSize: 13 }}>
        <strong>Error loading faculty data:</strong> {error}
      </div>
    );
  }

  const faculty    = data?.faculty || [];
  const unassigned = data?.unassigned || [];
  const meta       = data?.meta || {};

  const q = search.toLowerCase().trim();
  const filteredFaculty = q
    ? faculty.filter((f) =>
        (f.name || '').toLowerCase().includes(q) ||
        (f.email || '').toLowerCase().includes(q) ||
        (f.primary_subject || '').toLowerCase().includes(q) ||
        (f.channels || []).some((c) => c.chat_username.includes(q) || (c.subject || '').toLowerCase().includes(q))
      )
    : faculty;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            👥 Faculty Registry
          </h2>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
            {meta.total_faculty || 0} faculty · {meta.assigned_channels || 0} of {meta.total_channels || 0} channels assigned
            {(meta.unassigned_channels || 0) > 0 && <span style={{ color: '#dc2626', fontWeight: 600 }}> · {meta.unassigned_channels} unassigned</span>}
          </div>
        </div>
        <button onClick={load} style={{ padding: '8px 16px', border: '1px solid #cbd5e1', background: 'white', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#475569', cursor: 'pointer' }}>↻ Refresh</button>
      </div>

      {/* Hero strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10, marginBottom: 16 }}>
        <HeroCard label="👥 Faculty"           value={meta.total_faculty} color="#0f172a" />
        <HeroCard label="📢 Channels mapped"    value={`${meta.assigned_channels}/${meta.total_channels}`} color="#16a34a" />
        <HeroCard label="🔍 Unassigned"        value={meta.unassigned_channels || 0} color={(meta.unassigned_channels||0) > 0 ? '#dc2626' : '#16a34a'} />
        <HeroCard label="📅 Calendar status"   value="Phase 2" sub="Coming soon" color="#94a3b8" />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 14 }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, subject, or channel…"
          style={{ width: '100%', padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
        />
      </div>

      {/* Unassigned channels alert */}
      {unassigned.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', color: '#92400e', padding: 14, borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          <strong>⚠ {unassigned.length} channel{unassigned.length > 1 ? 's' : ''} unassigned.</strong> Pick a faculty for each:
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {unassigned.map((c) => (
              <UnassignedRow key={c.username} channel={c} faculty={faculty} onAssign={assign} saving={savingChan === c.username} />
            ))}
          </div>
        </div>
      )}

      {/* Faculty cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 12 }}>
        {filteredFaculty.map((f) => (
          <FacultyCard key={f.email} faculty={f} allFaculty={faculty} onAssign={assign} savingChan={savingChan} />
        ))}
      </div>
      {filteredFaculty.length === 0 && (
        <div style={{ padding: 30, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          No faculty match "{search}"
        </div>
      )}
    </div>
  );
}

function HeroCard({ label, value, sub, color }) {
  return (
    <div style={{ background: 'white', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1.1 }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function FacultyCard({ faculty, allFaculty, onAssign, savingChan }) {
  const chCount = (faculty.channels || []).length;
  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {faculty.name || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Unnamed</span>}
            </div>
            <a href={`mailto:${faculty.email}`} style={{ fontSize: 11, color: '#475569', textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
              {faculty.email}
            </a>
          </div>
          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {faculty.primary_subject}
          </span>
        </div>
      </div>

      <div style={{ padding: '10px 14px' }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
          Channels ({chCount})
        </div>
        {chCount === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>No channels assigned.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(faculty.channels || []).map((c) => (
              <div key={c.chat_username} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 6 }}>
                <a href={`https://t.me/${c.chat_username}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, minWidth: 0, color: '#0f172a', textDecoration: 'none', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  @{c.chat_username}
                </a>
                <span style={{ fontSize: 10, color: '#64748b' }}>{c.subject}</span>
                <button
                  onClick={() => onAssign(c.chat_username, null)}
                  disabled={savingChan === c.chat_username}
                  title="Unassign this channel"
                  style={{ padding: '2px 6px', border: '1px solid #fecaca', background: 'white', color: '#991b1b', borderRadius: 4, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}
                >
                  {savingChan === c.chat_username ? '⏳' : 'unassign'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UnassignedRow({ channel, faculty, onAssign, saving }) {
  const [selected, setSelected] = useState('');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', padding: '6px 10px', borderRadius: 6, border: '1px solid #fde68a' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>@{channel.username}</div>
        <div style={{ fontSize: 10, color: '#92400e' }}>{channel.subject}</div>
      </div>
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        style={{ padding: '4px 8px', border: '1px solid #fcd34d', borderRadius: 4, fontSize: 11, background: 'white', maxWidth: 220 }}
      >
        <option value="">Pick faculty…</option>
        {faculty.map((f) => (
          <option key={f.email} value={f.email}>{f.name || f.email} · {f.primary_subject}</option>
        ))}
      </select>
      <button
        onClick={() => selected && onAssign(channel.username, selected)}
        disabled={!selected || saving}
        style={{ padding: '4px 10px', border: 'none', background: selected ? '#0f172a' : '#cbd5e1', color: 'white', borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: selected ? 'pointer' : 'not-allowed' }}
      >
        {saving ? '⏳' : 'Assign'}
      </button>
    </div>
  );
}
