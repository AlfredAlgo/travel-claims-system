import React, { useState } from 'react';
import { Btn } from './Shared';

export default function RejectModal({ claim, onConfirm, onClose }) {
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
          The official will be notified by email with your rejection reason.
        </div>

        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
          Reason for rejection *
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="State the specific issue that needs to be resolved before this claim can proceed…"
          rows={5}
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            padding: '8px 10px', borderRadius: 'var(--radius)',
            border: '0.5px solid var(--border2)', fontSize: 13,
            background: 'var(--bg)', color: 'var(--text)',
            fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="danger" disabled={!reason.trim() || busy} onClick={handleConfirm}>
            <i className="ti ti-x" style={{ fontSize: 14 }} />
            {busy ? 'Rejecting…' : 'Confirm rejection'}
          </Btn>
        </div>
      </div>
    </>
  );
}
