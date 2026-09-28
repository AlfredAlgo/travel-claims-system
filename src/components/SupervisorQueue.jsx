import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge } from './Shared';
import SearchFilter from './SearchFilter';

const QC_ITEMS = [
  'Correspondence of dates', 'Destination verified', 'KM vs approved memo',
  'Purpose stated', 'Trip authority attached', 'Vehicle category & tariff noted',
];

function RejectModal({ claim, onConfirm, onClose }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy]   = useState(false);

  async function handleConfirm() {
    if (!reason.trim()) return;
    setBusy(true);
    await onConfirm(claim.ref, reason.trim());
    setBusy(false);
    onClose();
  }

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 480, background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', zIndex: 201,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Reject claim</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '0.75rem' }}>
          <strong>{claim.ref}</strong> · {claim.name}
        </div>

        <div style={{
          padding: '10px 12px', background: 'var(--red-bg)',
          borderRadius: 'var(--radius)', marginBottom: '1rem',
          fontSize: 12, color: 'var(--red-text)',
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 14, marginRight: 6, verticalAlign: -2 }} />
          The official will be notified by email and can see the reason in their claims portal.
        </div>

        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
          Reason for rejection *
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Log sheet not attached. KM claimed (350 km) does not match the approved route from Johannesburg to Durban. Please resubmit with the correct log sheet."
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            padding: '8px 10px', borderRadius: 'var(--radius)',
            border: '0.5px solid var(--border2)', fontSize: 13,
            background: 'var(--bg)', color: 'var(--text)',
            fontFamily: 'inherit',
          }}
          autoFocus
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn
            variant="danger"
            disabled={!reason.trim() || busy}
            onClick={handleConfirm}
          >
            <i className="ti ti-x" style={{ fontSize: 14 }} />
            {busy ? 'Rejecting…' : 'Confirm rejection'}
          </Btn>
        </div>
      </div>
    </>
  );
}

export default function SupervisorQueue({ claims, onApprove, onReject, onViewClaim }) {
  const pending = claims.filter(c => c.status === 'pending');
  const [filtered, setFiltered] = useState(pending);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [rejectModal, setRejectModal] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="Supervisor" /> Approve queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Review and sign off claims — verify dates, destination, km, purpose, approved memo
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--amber-bg)', border: '0.5px solid var(--amber-text)' }}>
        <div style={{ fontSize: 12, color: 'var(--amber-text)', fontWeight: 500, marginBottom: 6 }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          Checks &amp; balances — verify before approving:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_ITEMS.map(item => (
            <span key={item} style={{ fontSize: 12, color: 'var(--amber-text)' }}>
              <i className="ti ti-check" style={{ fontSize: 13, verticalAlign: -2, marginRight: 4 }} />{item}
            </span>
          ))}
        </div>
      </Card>

      <SearchFilter claims={pending} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th><th>Purpose</th>
              <th>Dates</th><th>KM</th><th>Amount</th><th>Docs</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {pending.length === 0 ? 'No claims pending approval' : 'No claims match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</td>
                <td style={{ fontSize: 12 }}>{c.dateFrom}{c.dateTo !== c.dateFrom ? ' – ' + c.dateTo : ''}</td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 120 }}>
                  {(c.docs?.length > 0 || c.attachments?.length > 0)
                    ? `${c.docs?.length || 0} doc${c.attachments?.length ? `, ${c.attachments.length} file${c.attachments.length !== 1 ? 's' : ''}` : ''}`
                    : <span style={{ color: 'var(--red-text)' }}>None</span>}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" onClick={() => onApprove(c.ref)}>
                      <i className="ti ti-check" style={{ fontSize: 13 }} /> Approve
                    </Btn>
                    <Btn variant="danger" size="sm" onClick={() => setRejectModal(c)}>
                      <i className="ti ti-x" style={{ fontSize: 13 }} /> Reject
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {rejectModal && (
        <RejectModal
          claim={rejectModal}
          onConfirm={onReject}
          onClose={() => setRejectModal(null)}
        />
      )}
    </div>
  );
}
