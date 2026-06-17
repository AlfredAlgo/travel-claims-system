import React from 'react';
import { Card, CardTitle, Metric, Btn, StatusBadge } from './Shared';
import { STATUS_META } from '../data/constants';

export default function Reports({ claims, toast }) {
  const paid = claims.filter(c => c.status === 'paid');
  const totalPaid = paid.reduce((s, c) => s + c.amount, 0);
  const statusCounts = {};
  claims.forEach(c => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>Reports</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Current financial year summary</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="Total claims"       value={claims.length}            sub="All statuses" />
        <Metric label="Total paid"         value={`R ${totalPaid.toFixed(2)}`} sub={`${paid.length} claims settled`} />
        <Metric label="Pending / in-flight" value={claims.filter(c => !['paid','rejected','draft'].includes(c.status)).length} sub="Active in workflow" />
      </div>

      <Card>
        <CardTitle>Claims by status</CardTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '8px 14px', background: 'var(--surface2)',
              borderRadius: 'var(--radius)',
            }}>
              <StatusBadge status={status} />
              <span style={{ fontSize: 20, fontWeight: 500 }}>{count}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Claims register</CardTitle>
        <table>
          <thead>
            <tr><th>Ref</th><th>Official</th><th>Purpose</th><th>KM</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {claims.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td>{c.name}</td>
                <td>{c.purpose}</td>
                <td>{c.km}</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {c.amount.toFixed(2)}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardTitle>Export</CardTitle>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn onClick={() => toast('Persal upload CSV exported')}>
            <i className="ti ti-download" style={{ fontSize: 15 }} /> Persal upload CSV
          </Btn>
          <Btn onClick={() => toast('PDF claims register generated')}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 15 }} /> Claims register PDF
          </Btn>
          <Btn onClick={() => toast('Excel workbook exported')}>
            <i className="ti ti-table" style={{ fontSize: 15 }} /> Excel workbook
          </Btn>
        </div>
      </Card>
    </div>
  );
}
