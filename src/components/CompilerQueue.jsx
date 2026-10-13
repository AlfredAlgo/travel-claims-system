import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';
import RejectModal from './RejectModal';
import SLABadge from './SLABadge';
import FeedbackRequestModal from './FeedbackRequestModal';
import { FeedbackRespondModal } from './MyClaims';

const QC_ITEMS = [
  'Supervisor signature present', 'Persal number confirmed',
  'T118 circular uploaded & tariff rate matches circular', 'Vehicle category confirmed against registration',
  'KM total verified', 'All trip legs recorded', 'Allocation codes correct',
];

export default function CompilerQueue({ claims, onCompile, onReject, onViewClaim, onRequestFeedback, onRespondFeedback }) {
  const queue        = claims.filter(c => c.status === 'approved');
  const feedbackPending = claims.filter(c => c.status === 'info_requested' && c.feedbackRecipientRole === 'compiler');

  const [filtered, setFiltered] = useState(queue);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [respondModal,  setRespondModal]  = useState(null);
  const [checks, setChecks] = useState({});
  const allChecked = QC_ITEMS.every(item => checks[item]);
  const doneCount  = QC_ITEMS.filter(item => checks[item]).length;

  async function handleCompile(ref) {
    await onCompile(ref);
    setChecks({});
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="Compiler" /> Compiler queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Compile supervisor-approved claims for verification — check all fields and codes before compiling
        </div>
      </div>

      {/* Changes requested FROM verifier — compiler must respond */}
      {feedbackPending.length > 0 && (
        <div style={{
          background: 'var(--amber-bg)', border: '0.5px solid var(--amber-text)',
          borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '1rem',
        }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--amber-text)', marginBottom: 6 }}>
            <i className="ti ti-message-exclamation" style={{ fontSize: 15, marginRight: 6, verticalAlign: -2 }} />
            {feedbackPending.length} claim{feedbackPending.length > 1 ? 's' : ''} awaiting your corrections (requested by Verifier)
          </div>
          {feedbackPending.map(c => (
            <div key={c.ref} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 0', borderTop: '0.5px solid var(--amber-text)30',
            }}>
              <div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, marginRight: 8 }}>{c.ref}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{c.name} · {c.purpose}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                  <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                </Btn>
                <Btn size="sm" onClick={() => setRespondModal(c)}
                  style={{ borderColor: 'var(--amber-text)', color: 'var(--amber-text)' }}>
                  <i className="ti ti-send" style={{ fontSize: 13 }} /> Respond
                </Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      <Card style={{ marginBottom: '1rem', background: 'var(--teal-bg)', border: '0.5px solid var(--teal-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--teal-text)', fontWeight: 500 }}>
            <i className="ti ti-list-check" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            Pre-compilation checks — tick each before compiling:
          </div>
          <span style={{ fontSize: 11, color: allChecked ? 'var(--green-text)' : 'var(--teal-text)', fontWeight: 500 }}>
            {doneCount}/{QC_ITEMS.length} {allChecked ? '✓ All clear' : 'completed'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_ITEMS.map(item => (
            <div key={item}
              onClick={() => setChecks(prev => ({ ...prev, [item]: !prev[item] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                fontSize: 12, color: checks[item] ? 'var(--green-text)' : 'var(--teal-text)',
                userSelect: 'none', padding: '2px 0',
              }}
            >
              <i className={`ti ti-${checks[item] ? 'square-check' : 'square'}`} style={{ fontSize: 14 }} />
              {item}
            </div>
          ))}
        </div>
      </Card>

      <SearchFilter claims={queue} onChange={handleFilter} />

      <Card noPad>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal #</th><th>Business unit</th>
              <th>Category</th><th>Tariff</th><th>KM</th><th>Amount</th><th>SLA</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {queue.length === 0 ? 'No approved claims to compile' : 'No records match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>{(c.dept || '').replace('GPG — ', '')}</td>
                <td style={{ fontSize: 12 }}>
                  {c.vehicleCategory
                    ? <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--blue-bg)', color: 'var(--blue-text)', padding: '2px 6px', borderRadius: 4 }}>Cat {c.vehicleCategory}</span>
                    : '—'}
                </td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {c.tariffRate > 0 ? `R ${parseFloat(c.tariffRate).toFixed(4)}` : '—'}
                </td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td><SLABadge claim={c} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" disabled={!allChecked}
                      title={allChecked ? '' : 'Tick all QC checks above before compiling'}
                      onClick={() => handleCompile(c.ref)}>
                      <i className="ti ti-checks" style={{ fontSize: 13 }} /> Compile
                    </Btn>
                    <Btn size="sm" onClick={() => setFeedbackModal(c)}
                      style={{ borderColor: 'var(--purple-text)', color: 'var(--purple-text)' }}>
                      <i className="ti ti-message-exclamation" style={{ fontSize: 13 }} /> Request changes
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
        <RejectModal claim={rejectModal} onConfirm={onReject} onClose={() => setRejectModal(null)} />
      )}
      {feedbackModal && (
        <FeedbackRequestModal
          claim={feedbackModal}
          recipientLabel="Official (claimant)"
          onSubmit={onRequestFeedback}
          onClose={() => setFeedbackModal(null)}
        />
      )}
      {respondModal && (
        <FeedbackRespondModal
          claim={respondModal}
          senderLabel="Verifier"
          onSubmit={onRespondFeedback}
          onClose={() => setRespondModal(null)}
        />
      )}
    </div>
  );
}
