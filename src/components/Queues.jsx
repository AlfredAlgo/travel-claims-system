import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';

export function ECMQueue({ claims, onRoute, onViewClaim }) {
  const ecm = claims.filter(c => c.status === 'ecm');
  const [filtered, setFiltered] = useState(ecm);
  const handleFilter = useCallback(r => setFiltered(r), []);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="HRS" /> ECM mandates
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Upload compiled mandate to ECM and route to DMC Payroll Team Leader
        </div>
      </div>

      <SearchFilter claims={ecm} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Mandate ref</th>
              <th>Persal status</th><th>Amount</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {ecm.length === 0 ? 'No mandates in ECM queue' : 'No records match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.mandate || '—'} /></td>
                <td><StatusBadge status="captured" /></td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="primary" size="sm" onClick={() => onRoute(c.ref)}>
                      <i className="ti ti-send" style={{ fontSize: 13 }} /> Route to DMC
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function DMCQueue({ claims, onPaid, onViewClaim }) {
  const routed = claims.filter(c => c.status === 'routed');
  const [filtered, setFiltered] = useState(routed);
  const handleFilter = useCallback(r => setFiltered(r), []);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="DMC" /> Payment run
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Receive mandate from ECM → pay on supplementary → verify payment confirmed on Persal
        </div>
      </div>

      <SearchFilter claims={routed} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th>
              <th>Mandate ref</th><th>Amount</th><th>Persal verification</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {routed.length === 0 ? 'No mandates received from ECM yet' : 'No records match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td><PersalTag code={c.mandate || '—'} /></td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    <div>Persal nr: {c.persal}</div>
                    <div>Amount: R {(c.amount || 0).toFixed(2)}</div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" onClick={() => onPaid(c.ref)}>
                      <i className="ti ti-check" style={{ fontSize: 13 }} /> Mark paid
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
