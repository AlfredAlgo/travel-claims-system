import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';

// ── Info request modal ────────────────────────────────────────────────────────

function RequestInfoModal({ claim, onSubmit, onClose }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit() {
    if (!message.trim()) return;
    setBusy(true);
    await onSubmit(claim.ref, message.trim());
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
          <div style={{ fontSize: 15, fontWeight: 500 }}>Request additional information</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: '0.75rem' }}>
          <strong>{claim.ref}</strong> · {claim.name}
        </div>

        <div style={{
          padding: '10px 12px', background: 'var(--purple-bg)',
          borderRadius: 'var(--radius)', marginBottom: '1rem',
          fontSize: 12, color: 'var(--purple-text)',
        }}>
          <i className="ti ti-info-circle" style={{ fontSize: 14, marginRight: 6, verticalAlign: -2 }} />
          The official will be notified by email and can respond directly from their claims portal.
        </div>

        <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>
          Describe what is missing or needs clarification *
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="e.g. Please attach the log sheet for trips on 15 May 2026. The km recorded (250 km) does not match the route from Johannesburg to Pretoria."
          rows={5}
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
          <Btn
            variant="primary"
            disabled={!message.trim() || busy}
            onClick={handleSubmit}
          >
            <i className="ti ti-send" style={{ fontSize: 14 }} />
            {busy ? 'Sending…' : 'Send request'}
          </Btn>
        </div>
      </div>
    </>
  );
}

// ── Main queue ────────────────────────────────────────────────────────────────

const QC_CHECKS = [
  'Persal number confirmed', 'Dates & ref verified',
  'Persal codes correct', 'Total km verified',
  'Tariff code (0469 / 0470)', 'Reason for travel stated', 'Vehicle capacity noted',
];

export default function InternalHRQueue({ claims, onPay, onRequestInfo, onViewClaim }) {
  const queue = claims.filter(c => c.status === 'approved');
  const [filtered, setFiltered] = useState(queue);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [infoModal, setInfoModal] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="HRS" /> Internal HR — Claims queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Review approved claims → verify details → mark as paid or request additional information
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--blue-bg)', border: '0.5px solid var(--blue)' }}>
        <div style={{ fontSize: 12, color: 'var(--blue-text)', fontWeight: 500, marginBottom: 6 }}>
          <i className="ti ti-list-check" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          Quality checks before processing:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_CHECKS.map(item => (
            <span key={item} style={{ fontSize: 12, color: 'var(--blue-text)' }}>
              <i className="ti ti-check" style={{ fontSize: 13, verticalAlign: -2, marginRight: 4 }} />{item}
            </span>
          ))}
        </div>
      </Card>

      <SearchFilter claims={queue} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th>
              <th>Persal code</th><th>KM</th><th>Amount</th><th>Documents</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {queue.length === 0 ? 'No approved claims in queue' : 'No records match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(c.dept || '').replace('GPG — ', '')}</div>
                </td>
                <td><PersalTag code={c.persal} /></td>
                <td><PersalTag code={c.kmBracket === 'more' ? '04069' : '04070'} /></td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {(c.docs || []).length === 0 && (c.docLinks || []).length === 0 && (
                      <span style={{ fontSize: 11, color: 'var(--red-text)' }}>None attached</span>
                    )}
                    {(c.docs || []).map(d => (
                      <span key={d} style={{ fontSize: 11, color: 'var(--text2)' }}>
                        <i className="ti ti-paperclip" style={{ fontSize: 10, marginRight: 3 }} />{d}
                      </span>
                    ))}
                    {(c.docLinks || []).map((dl, i) => (
                      <a key={i} href={dl.url} target="_blank" rel="noopener noreferrer" style={{
                        fontSize: 11, color: 'var(--blue-text)', textDecoration: 'none',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <i className="ti ti-download" style={{ fontSize: 11 }} />
                        {dl.name || 'Document'}
                      </a>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" onClick={() => onPay(c.ref)}>
                      <i className="ti ti-check" style={{ fontSize: 13 }} /> Mark paid
                    </Btn>
                    <Btn size="sm" onClick={() => setInfoModal(c)}
                      style={{ borderColor: 'var(--purple-text)', color: 'var(--purple-text)' }}>
                      <i className="ti ti-help" style={{ fontSize: 13 }} /> Request info
                    </Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {infoModal && (
        <RequestInfoModal
          claim={infoModal}
          onSubmit={onRequestInfo}
          onClose={() => setInfoModal(null)}
        />
      )}
    </div>
  );
}
