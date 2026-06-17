import React from 'react';
import { Card, Btn, StatusBadge } from './Shared';

export default function MyClaims({ claims, onNav, toast }) {
  const mine = claims; // filtered by persal in App.jsx
  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>My claims</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Track your submitted travel claims</div>
        </div>
        <Btn variant="primary" onClick={() => onNav('new-claim')}>
          <i className="ti ti-plus" style={{ fontSize: 15 }} /> New claim
        </Btn>
      </div>
      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Purpose</th><th>Trip dates</th><th>KM</th>
              <th>Amount</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {mine.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>No claims found</td></tr>
            ) : mine.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td>{c.purpose}</td>
                <td style={{ fontSize: 12 }}>{c.dateFrom}{c.dateTo !== c.dateFrom ? ' – ' + c.dateTo : ''}</td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {c.amount.toFixed(2)}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  <Btn size="sm" onClick={() => toast(`${c.ref} · ${c.purpose} · R ${c.amount.toFixed(2)}`)}>
                    <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
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
