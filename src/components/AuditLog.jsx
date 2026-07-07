import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardTitle, StatusBadge, Btn } from './Shared';
import { api } from '../utils/api';
import { STATUS_META } from '../data/constants';

function exportCSV(rows) {
  const cols = ['Timestamp', 'Claim Ref', 'Official', 'Persal', 'Dept', 'From Status', 'To Status', 'Changed By', 'Role', 'Note'];
  const escape = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(','), ...rows.map(r => [
    escape(new Date(r.created_at).toLocaleString('en-ZA')),
    escape(r.claims?.ref || ''),
    escape(r.claims?.name || ''),
    escape(r.claims?.persal || ''),
    escape(r.claims?.dept || ''),
    escape(STATUS_META[r.from_status]?.label || r.from_status || '—'),
    escape(STATUS_META[r.to_status]?.label || r.to_status || ''),
    escape(r.users?.name || ''),
    escape(r.users?.role || ''),
    escape(r.note || ''),
  ].join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `audit-log-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

export default function AuditLog({ toast }) {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]   = useState('');

  useEffect(() => {
    api.getAuditLog()
      .then(setRows)
      .catch(err => toast?.('Failed to load audit log: ' + err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = rows.filter(r => {
    const ts = r.created_at || '';
    const q  = search.toLowerCase();
    if (search && ![
      r.claims?.ref, r.claims?.name, r.claims?.persal,
      r.users?.name, r.note,
    ].some(v => (v || '').toLowerCase().includes(q))) return false;
    if (status && r.to_status !== status) return false;
    if (dateFrom && ts < dateFrom) return false;
    if (dateTo   && ts.slice(0,10) > dateTo) return false;
    return true;
  });

  const totalAmount = [...new Set(filtered.map(r => r.claims?.ref))].length;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>Audit trail</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Full log of every status change in the system
          </div>
        </div>
        <Btn onClick={() => exportCSV(filtered)}>
          <i className="ti ti-download" style={{ fontSize: 15 }} /> Export CSV
        </Btn>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1rem' }}>
        {[
          { label: 'Total events', value: filtered.length, sub: 'Status changes logged' },
          { label: 'Unique claims', value: totalAmount, sub: 'Claims referenced' },
          { label: 'Users involved', value: [...new Set(filtered.map(r => r.users?.name).filter(Boolean))].length, sub: 'Distinct actors' },
        ].map(m => (
          <div key={m.label} style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: 22, fontWeight: 500 }}>{m.value}</div>
            <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px',
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', marginBottom: '1rem',
      }}>
        <div style={{ position: 'relative', flex: '1 1 180px' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: 'var(--text3)' }} />
          <input placeholder="Search ref, name, user…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 30 }} />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 160 }}>
          <option value="">All status changes</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ width: 130 }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 11, color: 'var(--text3)' }}>To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ width: 130 }} />
        </div>
        {(search || status || dateFrom || dateTo) && (
          <button onClick={() => { setSearch(''); setStatus(''); setDateFrom(''); setDateTo(''); }}
            style={{ padding: '5px 10px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border2)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer' }}>
            <i className="ti ti-x" style={{ fontSize: 13, marginRight: 4 }} />Clear
          </button>
        )}
      </div>

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Timestamp</th><th>Claim ref</th><th>Official</th>
              <th>Department</th><th>Status change</th><th>Changed by</th><th>Note</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>No audit events match the current filters.</td></tr>
            ) : filtered.map(r => (
              <tr key={r.id}>
                <td style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
                  {new Date(r.created_at).toLocaleString('en-ZA')}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{r.claims?.ref || '—'}</td>
                <td style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>{r.claims?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{r.claims?.persal}</div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>{(r.claims?.dept || '—').replace('GPG — ', '')}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    {r.from_status ? <><StatusBadge status={r.from_status} /><i className="ti ti-arrow-right" style={{ fontSize: 11, color: 'var(--text3)' }} /></> : null}
                    <StatusBadge status={r.to_status} />
                  </div>
                </td>
                <td style={{ fontSize: 12 }}>
                  <div style={{ fontWeight: 500 }}>{r.users?.name || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'capitalize' }}>{r.users?.role}</div>
                </td>
                <td style={{ fontSize: 12, color: 'var(--text2)', fontStyle: r.note ? 'normal' : 'italic' }}>
                  {r.note || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
