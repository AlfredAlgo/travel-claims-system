import React from 'react';
import { Card, Btn, PersalTag, RoleBadge, StatusBadge } from './Shared';

export function ECMQueue({ claims, onRoute }) {
  const ecm = claims.filter(c => c.status === 'ecm');
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
      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Mandate ref</th>
              <th>Persal status</th><th>Amount</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {ecm.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                No mandates in ECM queue
              </td></tr>
            ) : ecm.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.mandate || '—'} /></td>
                <td><StatusBadge status="captured" /></td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {c.amount.toFixed(2)}</td>
                <td>
                  <Btn variant="primary" size="sm" onClick={() => onRoute(c.ref)}>
                    <i className="ti ti-send" style={{ fontSize: 13 }} /> Route to DMC
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

export function DMCQueue({ claims, onPaid }) {
  const routed = claims.filter(c => c.status === 'routed');
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
      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th>
              <th>Mandate ref</th><th>Amount</th><th>Persal verification</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {routed.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                No mandates received from ECM yet
              </td></tr>
            ) : routed.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td><PersalTag code={c.mandate || '—'} /></td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {c.amount.toFixed(2)}</td>
                <td>
                  <div style={{ fontSize: 11, color: 'var(--text2)' }}>
                    <div>Persal nr: {c.persal}</div>
                    <div>Amount: R {c.amount.toFixed(2)}</div>
                  </div>
                </td>
                <td>
                  <Btn variant="success" size="sm" onClick={() => onPaid(c.ref)}>
                    <i className="ti ti-check" style={{ fontSize: 13 }} /> Mark paid
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
