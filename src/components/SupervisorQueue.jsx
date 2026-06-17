import React from 'react';
import { Card, Btn, PersalTag, RoleBadge } from './Shared';

const QC_ITEMS = ['Correspondence of dates', 'Destination verified', 'KM vs log sheet', 'Purpose stated', 'Trip authority attached', 'Vehicle capacity noted'];

export default function SupervisorQueue({ claims, onApprove, onReject }) {
  const pending = claims.filter(c => c.status === 'pending');
  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="Supervisor" /> Approve queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Review and sign off claims — verify dates, destination, km, purpose, log sheet
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--amber-bg)', border: '0.5px solid var(--amber-text)' }}>
        <div style={{ fontSize: 12, color: 'var(--amber-text)', fontWeight: 500, marginBottom: 6 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          Checks & balances — verify before approving:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_ITEMS.map(item => (
            <span key={item} style={{ fontSize: 12, color: 'var(--amber-text)' }}>
              <i className="ti ti-check" style={{ fontSize: 13, verticalAlign: -2, marginRight: 4 }} />{item}
            </span>
          ))}
        </div>
      </Card>

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th><th>Purpose</th>
              <th>Dates</th><th>KM</th><th>Amount</th><th>Documents</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                No claims pending approval
              </td></tr>
            ) : pending.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td style={{ maxWidth: 160 }}>{c.purpose}</td>
                <td style={{ fontSize: 12 }}>{c.dateFrom}{c.dateTo !== c.dateFrom ? ' – ' + c.dateTo : ''}</td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {c.amount.toFixed(2)}</td>
                <td style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 120 }}>
                  {c.docs.length > 0 ? c.docs.join(', ') : <span style={{ color: 'var(--red-text)' }}>None attached</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn variant="success" size="sm" onClick={() => onApprove(c.ref)}>
                      <i className="ti ti-check" style={{ fontSize: 13 }} /> Approve
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
