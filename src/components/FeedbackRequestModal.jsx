import React, { useState } from 'react';
import { Btn } from './Shared';

// targetOptions: [{ value: 'official', label: 'Official (claimant)' }, ...]
export default function FeedbackRequestModal({ claim, targetOptions = [], onSubmit, onClose }) {
  const [message,    setMessage]    = useState('');
  const [targetRole, setTargetRole] = useState(targetOptions[0]?.value || '');
  const [busy,       setBusy]       = useState(false);

  const selectedLabel = targetOptions.find(o => o.value === targetRole)?.label || '';

  async function handleSubmit() {
    if (!message.trim()) return;
    setBusy(true);
    try {
      await onSubmit(claim.ref, message.trim(), targetRole);
      onClose();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 500, background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', zIndex: 201,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Request changes</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '0.75rem' }}>
          <strong>{claim.ref}</strong> · {claim.name}
        </div>

        {/* Target role selector */}
        {targetOptions.length > 1 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 5 }}>
              Send request to *
            </label>
            <select
              value={targetRole}
              onChange={e => setTargetRole(e.target.value)}
              style={{
                width: '100%', padding: '7px 10px', fontSize: 13,
                border: '0.5px solid var(--border2)', borderRadius: 'var(--radius)',
                background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
              }}
            >
              {targetOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{
          padding: '10px 12px', background: 'var(--purple-bg)',
          borderRadius: 'var(--radius)', marginBottom: '1rem',
          fontSize: 12, color: 'var(--purple-text)',
        }}>
          <i className="ti ti-user-exclamation" style={{ fontSize: 14, marginRight: 6, verticalAlign: -2 }} />
          <strong>{selectedLabel || targetOptions[0]?.label}</strong> will be notified and can respond with a message and replacement documents.
        </div>

        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
          Describe what needs to be corrected or provided *
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. The vehicle registration number is missing. Please also reattach the log sheet — the one uploaded is illegible."
          rows={5}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            padding: '8px 10px', borderRadius: 'var(--radius)',
            border: '0.5px solid var(--border2)', fontSize: 13,
            background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1rem' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={!message.trim() || busy} onClick={handleSubmit}>
            <i className="ti ti-send" style={{ fontSize: 14 }} />
            {busy ? 'Sending…' : 'Send request'}
          </Btn>
        </div>
      </div>
    </>
  );
}
