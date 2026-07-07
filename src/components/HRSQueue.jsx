import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge } from './Shared';
import SearchFilter from './SearchFilter';

const QC_CHECKS = [
  'Persal number confirmed', 'Dates & ref number verified', 'Persal codes correct',
  'Total km travelled', 'Tariff code (0469 / 0470)', 'Reason for travelling stated', 'Vehicle capacity noted',
];

export default function HRSQueue({ claims, onCapture, onReject, onViewClaim }) {
  const approved = claims.filter(c => c.status === 'approved');
  const [filtered, setFiltered] = useState(approved);
  const handleFilter = useCallback(r => setFiltered(r), []);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="HRS" /> Persal capture
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Quality check → capture on Persal → upload mandate to ECM → route to DMC Payroll
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--blue-bg)', border: '0.5px solid var(--blue)' }}>
        <div style={{ fontSize: 12, color: 'var(--blue-text)', fontWeight: 500, marginBottom: 6 }}>
          <i className="ti ti-list-check" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          HRS quality checks before Persal capture:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_CHECKS.map(item => (
            <span key={item} style={{ fontSize: 12, color: 'var(--blue-text)' }}>
              <i className="ti ti-check" style={{ fontSize: 13, verticalAlign: -2, marginRight: 4 }} />{item}
            </span>
          ))}
        </div>
      </Card>

      <SearchFilter claims={approved} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th>
              <th>Persal codes</th><th>KM</th><th>Amount</th><th>QC status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {approved.length === 0 ? 'No approved claims ready for Persal capture' : 'No claims match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td><PersalTag code={c.kmBracket === 'more' ? '04069' : '04070'} /></td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td>
                  <div style={{ fontSize: 11, color: 'var(--green-text)' }}>
                    <div><i className="ti ti-check" style={{ fontSize: 12 }} /> Supervisor approved</div>
                    <div><i className="ti ti-check" style={{ fontSize: 12 }} /> Persal nr verified</div>
                    <div><i className="ti ti-check" style={{ fontSize: 12 }} /> Tariff confirmed</div>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="primary" size="sm" onClick={() => onCapture(c.ref)}>
                      <i className="ti ti-database" style={{ fontSize: 13 }} /> Capture &amp; ECM
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => onReject(c.ref)}>
                      <i className="ti ti-x" style={{ fontSize: 13 }} /> Reject
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
