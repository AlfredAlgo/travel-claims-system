import React, { useState, useEffect } from 'react';
import { Card, CardTitle, Btn } from './Shared';
import { api } from '../utils/api';

const STATUS_LABELS = {
  pending:     'Supervisor approval (Pending)',
  approved:    'Compiler processing (Approved)',
  compiled:    'Verifier check (Compiled)',
  verified:    'HR Approver sign-off (Verified)',
  hr_approved: 'HRS payment processing (HR Approved)',
};

export default function SLATargets({ toast }) {
  const [targets, setTargets] = useState([]);
  const [editing, setEditing] = useState(null); // { status, days }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getSLATargets()
      .then(setTargets)
      .catch(err => toast('Error: ' + err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleSave() {
    if (!editing || editing.days < 1) return;
    try {
      const updated = await api.updateSLATarget(editing.status, editing.days);
      setTargets(prev => prev.map(t => t.status === updated.status ? updated : t));
      setEditing(null);
      toast('SLA target updated');
    } catch (err) {
      toast('Error: ' + err.message);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>SLA targets</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Configure the working-day targets for each workflow stage. Claims exceeding these turn amber (60%) then red (100%).
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Loading…</div>
      ) : (
        <Card>
          <table>
            <thead>
              <tr>
                <th>Stage</th>
                <th>Target (working days)</th>
                <th>On-track threshold</th>
                <th>Warning threshold</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {targets.map(t => (
                <tr key={t.status}>
                  <td style={{ fontWeight: 500 }}>{STATUS_LABELS[t.status] || t.status}</td>
                  <td>
                    {editing?.status === t.status ? (
                      <input
                        type="number"
                        min={1} max={30}
                        value={editing.days}
                        onChange={e => setEditing(prev => ({ ...prev, days: parseInt(e.target.value) || 1 }))}
                        style={{ width: 70, fontFamily: 'var(--mono)' }}
                        autoFocus
                      />
                    ) : (
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600 }}>
                        {t.working_days}d
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--green-text)' }}>
                    ≤ {Math.floor((editing?.status === t.status ? editing.days : t.working_days) * 0.6)}d
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--amber-text)' }}>
                    {Math.floor((editing?.status === t.status ? editing.days : t.working_days) * 0.6) + 1}d –{' '}
                    {editing?.status === t.status ? editing.days : t.working_days}d
                  </td>
                  <td>
                    {editing?.status === t.status ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Btn size="sm" variant="primary" onClick={handleSave}>Save</Btn>
                        <Btn size="sm" onClick={() => setEditing(null)}>Cancel</Btn>
                      </div>
                    ) : (
                      <Btn size="sm" onClick={() => setEditing({ status: t.status, days: t.working_days })}>
                        <i className="ti ti-pencil" style={{ fontSize: 13 }} /> Edit
                      </Btn>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
