import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge } from './Shared';
import SearchFilter from './SearchFilter';
import RejectModal from './RejectModal';
import FeedbackRequestModal from './FeedbackRequestModal';
import { attachmentUrl } from '../utils/api';

const FEEDBACK_TARGETS = [
  { value: 'compiler', label: 'HR Compiler' },
  { value: 'approver', label: 'HR Approver' },
];

const QC_CHECKS = [
  'Persal number confirmed', 'Dates & ref verified',
  'Persal codes correct', 'Total km verified',
  'Tariff category & rate verified', 'Reason for travel stated',
];

export default function HRSQueue({ claims, onPay, onRequestFeedback, onReject, onViewClaim }) {
  const queue = claims.filter(c => c.status === 'hr_approved');
  const [filtered, setFiltered] = useState(queue);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [checks, setChecks] = useState({});
  const allChecked = QC_CHECKS.every(item => checks[item]);
  const doneCount  = QC_CHECKS.filter(item => checks[item]).length;

  async function handlePay(ref) {
    await onPay(ref);
    setChecks({});
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="HRS" /> HRS — Claims queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Review HR-approved claims → verify details → mark as paid on Persal or request additional information
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--blue-bg)', border: '0.5px solid var(--blue)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--blue-text)', fontWeight: 500 }}>
            <i className="ti ti-list-check" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            Quality checks before processing — tick each before marking paid:
          </div>
          <span style={{ fontSize: 11, color: allChecked ? 'var(--green-text)' : 'var(--blue-text)', fontWeight: 500 }}>
            {doneCount}/{QC_CHECKS.length} {allChecked ? '✓ All clear' : 'completed'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_CHECKS.map(item => (
            <div key={item}
              onClick={() => setChecks(prev => ({ ...prev, [item]: !prev[item] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                fontSize: 12, color: checks[item] ? 'var(--green-text)' : 'var(--blue-text)',
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
              <th>Ref</th><th>Official</th><th>Persal #</th>
              <th>Category</th><th>KM</th><th>Amount</th><th>Documents</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {queue.length === 0 ? 'No HR-approved claims in queue' : 'No records match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>
                  {c.ref}
                  {c.isLateSubmission && (
                    <span style={{ marginLeft: 4, fontSize: 9, background: 'var(--amber-bg)', color: 'var(--amber-text)', padding: '1px 4px', borderRadius: 3 }}>
                      Late
                    </span>
                  )}
                </td>
                <td>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{(c.dept || '').replace('GPG — ', '')}</div>
                </td>
                <td><PersalTag code={c.persal} /></td>
                <td>
                  {c.vehicleCategory
                    ? <span style={{ fontFamily: 'var(--mono)', fontSize: 11, background: 'var(--blue-bg)', color: 'var(--blue-text)', padding: '2px 6px', borderRadius: 4 }}>Cat {c.vehicleCategory}</span>
                    : c.kmBracket === 'more'
                      ? <PersalTag code="04069" />
                      : <PersalTag code="04070" />}
                </td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>R {(c.amount || 0).toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {(c.docs || []).length === 0 && (c.attachments || []).length === 0 && (
                      <span style={{ fontSize: 11, color: 'var(--red-text)' }}>None attached</span>
                    )}
                    {(c.docs || []).map(d => (
                      <span key={d} style={{ fontSize: 11, color: 'var(--text2)' }}>
                        <i className="ti ti-paperclip" style={{ fontSize: 10, marginRight: 3 }} />{d}
                      </span>
                    ))}
                    {(c.attachments || []).map(a => (
                      <a
                        key={a.id}
                        href={attachmentUrl(c.ref, a.id)}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 11, color: 'var(--blue-text)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}
                      >
                        <i className="ti ti-download" style={{ fontSize: 11 }} />
                        {a.fileName}
                      </a>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" disabled={!allChecked}
                      title={allChecked ? '' : 'Tick all QC checks above before marking as paid'}
                      onClick={() => handlePay(c.ref)}>
                      <i className="ti ti-check" style={{ fontSize: 13 }} /> Mark paid
                    </Btn>
                    <Btn size="sm" onClick={() => setFeedbackModal(c)}
                      style={{ borderColor: 'var(--purple-text)', color: 'var(--purple-text)' }}>
                      <i className="ti ti-help" style={{ fontSize: 13 }} /> Request info
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

      {feedbackModal && (
        <FeedbackRequestModal
          claim={feedbackModal}
          targetOptions={FEEDBACK_TARGETS}
          onSubmit={onRequestFeedback}
          onClose={() => setFeedbackModal(null)}
        />
      )}
      {rejectModal && (
        <RejectModal claim={rejectModal} onConfirm={onReject} onClose={() => setRejectModal(null)} />
      )}
    </div>
  );
}
