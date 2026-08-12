import React, { useState, useCallback } from 'react';
import { Card, Btn, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';

// ── Respond to info request modal ─────────────────────────────────────────────

function RespondModal({ claim, onSubmit, onClose }) {
  const [message, setMessage] = useState('');
  const [docLinks, setDocLinks] = useState([{ name: '', url: '' }]);
  const [busy, setBusy] = useState(false);

  function addLink() { setDocLinks(prev => [...prev, { name: '', url: '' }]); }
  function removeLink(i) { setDocLinks(prev => prev.filter((_, idx) => idx !== i)); }
  function updateLink(i, field, val) {
    setDocLinks(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }

  async function handleSubmit() {
    setBusy(true);
    const validLinks = docLinks.filter(l => l.url.trim());
    await onSubmit(claim.ref, message.trim(), validLinks);
    setBusy(false);
    onClose();
  }

  const infoRequest = claim._infoMessage || '';

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 540, background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', zIndex: 201,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>Respond to information request</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '0.75rem' }}>
          <strong>{claim.ref}</strong> · {claim.purpose}
        </div>

        {infoRequest && (
          <div style={{
            padding: '10px 12px', background: 'var(--purple-bg)',
            border: '0.5px solid var(--purple-text)', borderRadius: 'var(--radius)',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--purple-text)', marginBottom: 4 }}>
              <i className="ti ti-help" style={{ fontSize: 13, marginRight: 4, verticalAlign: -1 }} />
              Internal HR requested:
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}>{infoRequest}</div>
          </div>
        )}

        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
          Your response
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Explain what you've added or clarified…"
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
          Additional document links (optional)
        </div>
        {docLinks.map((l, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
            <input
              placeholder="Document name"
              value={l.name}
              onChange={e => updateLink(i, 'name', e.target.value)}
              style={{ fontSize: 12 }}
            />
            <input
              placeholder="https://drive.google.com/…"
              value={l.url}
              onChange={e => updateLink(i, 'url', e.target.value)}
              style={{ fontSize: 12 }}
            />
            <button onClick={() => removeLink(i)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', fontSize: 16, padding: 0,
            }}>×</button>
          </div>
        ))}
        <button onClick={addLink} style={{
          background: 'none', border: '0.5px dashed var(--border2)',
          borderRadius: 'var(--radius)', padding: '4px 10px',
          fontSize: 12, color: 'var(--text2)', cursor: 'pointer', marginBottom: '1rem',
        }}>
          <i className="ti ti-plus" style={{ fontSize: 12, marginRight: 4 }} />Add document link
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

export default function MyClaims({ claims, onNav, onViewClaim, onRespondInfo, toast }) {
  const [filtered, setFiltered] = useState(claims);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [respondModal, setRespondModal] = useState(null);

  const infoRequested = claims.filter(c => c.status === 'info_requested');

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

      {/* Info requested alert banner */}
      {infoRequested.length > 0 && (
        <div style={{
          background: 'var(--purple-bg)', border: '0.5px solid var(--purple-text)',
          borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '1rem',
        }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--purple-text)', marginBottom: 6 }}>
            <i className="ti ti-help" style={{ fontSize: 15, marginRight: 6, verticalAlign: -2 }} />
            Action required — {infoRequested.length} claim{infoRequested.length > 1 ? 's' : ''} need{infoRequested.length === 1 ? 's' : ''} additional information
          </div>
          {infoRequested.map(c => (
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
                    {c.status === 'info_requested' && (
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
        <RespondModal
          claim={respondModal}
          onSubmit={onRespondInfo}
          onClose={() => setRespondModal(null)}
        />
      )}
    </div>
  );
}
