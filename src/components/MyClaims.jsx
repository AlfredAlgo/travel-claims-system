import React, { useState, useRef, useCallback } from 'react';
import { Card, Btn, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';
import { buildAttachment } from '../utils/api';

// ── Shared feedback respond modal (used by official in MyClaims) ──────────────

export function FeedbackRespondModal({ claim, senderLabel, onSubmit, onClose }) {
  const [message,     setMessage]     = useState('');
  const [attachments, setAttachments] = useState([]);
  const [busy,        setBusy]        = useState(false);
  const inputRef = useRef();

  async function handleFileAdd(e) {
    const files = Array.from(e.target.files);
    e.target.value = '';
    for (const f of files) {
      if (f.size > 10 * 1024 * 1024) { alert('File too large — max 10 MB'); continue; }
      try {
        const att = await buildAttachment(f, 'feedback-response');
        setAttachments(prev => [...prev, att]);
      } catch { alert('Failed to read file'); }
    }
  }

  async function handleSubmit() {
    setBusy(true);
    try {
      await onSubmit(claim.ref, message.trim(), attachments);
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
        width: 540, background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', zIndex: 201,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Respond to changes request</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '0.75rem' }}>
          <strong>{claim.ref}</strong> · {claim.purpose}
        </div>

        {/* Show the latest feedback message from history if available */}
        <div style={{
          padding: '10px 12px', background: 'var(--purple-bg)',
          border: '0.5px solid var(--purple-text)', borderRadius: 'var(--radius)', marginBottom: '1rem',
        }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--purple-text)', marginBottom: 4 }}>
            <i className="ti ti-message-exclamation" style={{ fontSize: 13, marginRight: 4, verticalAlign: -1 }} />
            {senderLabel || 'Changes'} requested — check the claim history for details
          </div>
          <div style={{ fontSize: 12, color: 'var(--text2)' }}>
            View the claim's History tab to see exactly what was requested.
          </div>
        </div>

        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
          Your response <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(optional message)</span>
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Explain what you've corrected or added…"
          rows={4}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical',
            padding: '8px 10px', borderRadius: 'var(--radius)',
            border: '0.5px solid var(--border2)', fontSize: 13,
            background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit',
            marginBottom: '1rem',
          }}
        />

        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>
          Attach replacement documents
        </div>

        {attachments.map((a, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', background: 'var(--blue-bg)',
            borderRadius: 'var(--radius)', marginBottom: 4, fontSize: 12,
          }}>
            <i className="ti ti-paperclip" style={{ fontSize: 13, color: 'var(--blue-text)' }} />
            <span style={{ flex: 1, color: 'var(--blue-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.fileName}</span>
            <span style={{ color: 'var(--text3)', fontSize: 11 }}>{a.fileSize > 0 ? `${(a.fileSize / 1024).toFixed(0)} KB` : ''}</span>
            <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 15, padding: 0 }}>×</button>
          </div>
        ))}

        <input ref={inputRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          style={{ display: 'none' }} onChange={handleFileAdd} />
        <button onClick={() => inputRef.current?.click()} style={{
          background: 'none', border: '0.5px dashed var(--border2)',
          borderRadius: 'var(--radius)', padding: '5px 12px',
          fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: '1.25rem',
        }}>
          <i className="ti ti-upload" style={{ fontSize: 13 }} />
          Upload replacement document
        </button>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn variant="primary" disabled={busy} onClick={handleSubmit}>
            <i className="ti ti-send" style={{ fontSize: 14 }} />
            {busy ? 'Submitting…' : 'Submit response'}
          </Btn>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MyClaims({ claims, onNav, onViewClaim, onRespondFeedback, toast }) {
  const [filtered, setFiltered] = useState(claims);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [respondModal, setRespondModal] = useState(null);

  // Only show feedback requests directed to the official (or legacy with no recipient set)
  const feedbackRequested = claims.filter(c =>
    c.status === 'info_requested' &&
    (!c.feedbackRecipientRole || c.feedbackRecipientRole === 'official')
  );

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

      {feedbackRequested.length > 0 && (
        <div style={{
          background: 'var(--purple-bg)', border: '0.5px solid var(--purple-text)',
          borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '1rem',
        }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--purple-text)', marginBottom: 6 }}>
            <i className="ti ti-message-exclamation" style={{ fontSize: 15, marginRight: 6, verticalAlign: -2 }} />
            Action required — {feedbackRequested.length} claim{feedbackRequested.length > 1 ? 's need' : ' needs'} changes before processing
          </div>
          {feedbackRequested.map(c => (
            <div key={c.ref} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 0', borderTop: '0.5px solid var(--purple-text)20',
            }}>
              <div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, marginRight: 8 }}>{c.ref}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.purpose}</span>
              </div>
              <Btn size="sm" onClick={() => setRespondModal(c)}
                style={{ borderColor: 'var(--purple-text)', color: 'var(--purple-text)' }}>
                <i className="ti ti-send" style={{ fontSize: 13 }} /> Respond
              </Btn>
            </div>
          ))}
        </div>
      )}

      <SearchFilter claims={claims} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Purpose</th><th>Trip dates</th><th>KM</th>
              <th>Amount</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {claims.length === 0 ? 'No claims yet.' : 'No claims match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref} style={{ background: c.status === 'info_requested' ? 'var(--purple-bg)' : undefined }}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</td>
                <td style={{ fontSize: 12 }}>{c.dateFrom}{c.dateTo !== c.dateFrom ? ' – ' + c.dateTo : ''}</td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td><StatusBadge status={c.status} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    {c.status === 'info_requested' &&
                      (!c.feedbackRecipientRole || c.feedbackRecipientRole === 'official') && (
                      <Btn size="sm" onClick={() => setRespondModal(c)}
                        style={{ borderColor: 'var(--purple-text)', color: 'var(--purple-text)' }}>
                        <i className="ti ti-send" style={{ fontSize: 13 }} /> Respond
                      </Btn>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {respondModal && (
        <FeedbackRespondModal
          claim={respondModal}
          senderLabel="HR / Supervisor"
          onSubmit={onRespondFeedback}
          onClose={() => setRespondModal(null)}
        />
      )}
    </div>
  );
}
