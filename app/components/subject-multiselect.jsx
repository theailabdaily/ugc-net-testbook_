'use client';
import { useEffect, useRef, useState } from 'react';

// MultiSelect — popover with checkboxes
// Props:
//   options: string[]           list of option labels
//   value: string[]             currently-selected labels (empty = all)
//   onChange: (string[]) => void
//   label: string               button label prefix
export default function SubjectMultiSelect({ options, value, onChange, label = 'Subjects' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const allSelected = value.length === 0 || value.length === options.length;

  const toggle = (opt) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const selectAll = () => onChange([]);
  const clearAll  = () => onChange(['__none__']); // sentinel: filter to nothing
  const hasNoneSentinel = value.includes('__none__');

  const buttonLabel = hasNoneSentinel
    ? `${label} (None)`
    : allSelected
      ? `${label} (All)`
      : `${label} (${value.length})`;

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          padding: '6px 12px',
          border: '1px solid #cbd5e1',
          borderRadius: 6,
          fontSize: 13,
          cursor: 'pointer',
          background: 'white',
          minWidth: 130,
          textAlign: 'left',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 6,
          fontWeight: 500,
          color: '#0f172a',
        }}
      >
        <span>{buttonLabel}</span>
        <span style={{ color: '#64748b', fontSize: 10 }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          width: 280,
          maxHeight: 400,
          background: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Search */}
          <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
              style={{
                width: '100%',
                padding: '6px 10px',
                border: '1px solid #e2e8f0',
                borderRadius: 6,
                fontSize: 12,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: 4, padding: '6px 8px', borderBottom: '1px solid #f1f5f9' }}>
            <button onClick={selectAll} style={{
              flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', background: 'white',
              borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#475569',
            }}>Select all</button>
            <button onClick={clearAll} style={{
              flex: 1, padding: '4px 8px', border: '1px solid #cbd5e1', background: 'white',
              borderRadius: 4, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#475569',
            }}>Clear</button>
          </div>

          {/* Options */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: 280 }}>
            {filtered.length === 0 && (
              <div style={{ padding: 12, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                No matches
              </div>
            )}
            {filtered.map((opt) => {
              const checked = !hasNoneSentinel && (allSelected || value.includes(opt));
              return (
                <label
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 10px',
                    fontSize: 13,
                    cursor: 'pointer',
                    color: '#0f172a',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      // If currently "all selected" (empty value array), switch to explicit selection minus this one
                      if (allSelected && !hasNoneSentinel) {
                        onChange(options.filter((o) => o !== opt));
                      } else if (hasNoneSentinel) {
                        onChange([opt]);
                      } else {
                        toggle(opt);
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper: filter a list of channels by selected subject labels
export function applySubjectFilter(channels, selectedSubjects, subjectMap) {
  // Empty array = no filter applied (show all)
  if (!selectedSubjects || selectedSubjects.length === 0) return channels || [];
  // None sentinel = show nothing
  if (selectedSubjects.includes('__none__')) return [];
  return (channels || []).filter((c) => {
    const subj = subjectMap[c.username] || c.username;
    return selectedSubjects.includes(subj);
  });
}
