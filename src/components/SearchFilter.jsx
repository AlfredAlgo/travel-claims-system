import React, { useState, useEffect, useCallback } from 'react';
import { STATUS_META } from '../data/constants';

export default function SearchFilter({ claims, onChange, extraFilters }) {
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [dept, setDept]         = useState('');

  const depts = [...new Set(claims.map(c => c.dept).filter(Boolean))].sort();

  const apply = useCallback(() => {
    let out = claims;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter(c =>
        c.ref?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q) ||
        c.purpose?.toLowerCase().includes(q) ||
        c.persal?.toLowerCase().includes(q)
      );
    }
    if (status)   out = out.filter(c => c.status === status);
    if (dateFrom) out = out.filter(c => (c.dateFrom || c.createdAt || '') >= dateFrom);
    if (dateTo)   out = out.filter(c => (c.dateTo   || c.createdAt || '') <= dateTo);
    if (dept)     out = out.filter(c => c.dept === dept);
    onChange(out);
  }, [claims, search, status, dateFrom, dateTo, dept, onChange]);

  useEffect(() => { apply(); }, [apply]);

  function reset() {
    setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); setDept('');
  }

  const hasFilter = search || status || dateFrom || dateTo || dept;

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center',
      padding: '10px 14px',
      background: 'var(--surface)', border: '0.5px solid var(--border)',
      borderRadius: 'var(--radius-lg)', marginBottom: '1rem',
    }}>
      <div style={{ position: 'relative', flex: '1 1 180px' }}>
        <i className="ti ti-search" style={{
          position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
          fontSize: 14, color: 'var(--text3)', pointerEvents: 'none',
        }} />
        <input
          placeholder="Search ref, name, purpose…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingLeft: 30, minWidth: 0 }}
        />
      </div>

      <select value={status} onChange={e => setStatus(e.target.value)} style={{ flex: '0 0 auto', width: 150 }}>
        <option value="">All statuses</option>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>

      <select value={dept} onChange={e => setDept(e.target.value)} style={{ flex: '0 0 auto', width: 150 }}>
        <option value="">All departments</option>
        {depts.map(d => <option key={d} value={d}>{d.replace('GPG — ', '')}</option>)}
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
        <label style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>From</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 130 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: '0 0 auto' }}>
        <label style={{ fontSize: 11, color: 'var(--text3)', whiteSpace: 'nowrap' }}>To</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 130 }} />
      </div>

      {extraFilters}

      {hasFilter && (
        <button onClick={reset} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '5px 10px', borderRadius: 'var(--radius)',
          border: '0.5px solid var(--border2)', background: 'var(--surface2)',
          color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
          flex: '0 0 auto',
        }}>
          <i className="ti ti-x" style={{ fontSize: 13 }} /> Clear
        </button>
      )}
    </div>
  );
}
