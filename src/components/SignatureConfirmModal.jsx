import React, { useState } from 'react';
import { Btn } from './Shared';
import SignaturePad from './SignaturePad';

export default function SignatureConfirmModal({ claim, title, sigLabel, onConfirm, onClose }) {
  const [sigData, setSigData] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm(sigData);
    } catch (err) {
      alert('Error: ' + err.message);
      setBusy(false);
    }
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
        width: 520, background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', zIndex: 201,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            <i className="ti ti-signature" style={{ fontSize: 17, verticalAlign: -3, marginRight: 7 }} />
            {title}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '1rem' }}>
          <strong>{claim.ref}</strong> · {claim.name} · R {(claim.amount || 0).toFixed(2)}
        </div>

        <div style={{
          padding: '10px 12px', background: 'var(--blue-bg)',
          borderRadius: 'var(--radius)', marginBottom: '1.25rem',
          fontSize: 12, color: 'var(--blue-text)',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, marginRight: 6, verticalAlign: -2 }} />
          Your signature will be embedded in the Z584 PDF as part of the audit trail. A blank
          submission is allowed but the PDF will show an unsigned block.
        </div>

        <SignaturePad
          label={sigLabel || 'Draw your signature'}
          value={sigData}
          onChange={setSigData}
          height={120}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="success" onClick={handleConfirm} disabled={busy}>
            <i className="ti ti-circle-check" style={{ fontSize: 14 }} />
            {busy ? 'Saving…' : sigData ? 'Sign & confirm' : 'Confirm without signature'}
          </Btn>
        </div>
      </div>
    </>
  );
}
