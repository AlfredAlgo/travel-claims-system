import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';
import RejectModal from './RejectModal';
import SLABadge from './SLABadge';
import FeedbackRequestModal from './FeedbackRequestModal';

const QC_ITEMS = [
  'Line manager approved', 'Persal number confirmed',
  'Vehicle category & tariff rate noted', 'T118 circular uploaded',
  'Log book / trip log sheet attached', 'Dates & km verified',
];

const FEEDBACK_TARGETS = [
  { value: 'official',    label: 'Official (claimant)' },
  { value: 'supervisor',  label: 'Line Manager (Supervisor)' },
];

export default function HrmSupervisorQueue({ claims, onAllocate, onReject, onViewClaim, onRequestFeedback }) {
  const queue = claims.filter(c => c.status === 'hrm_pending');
  const [filtered, setFiltered] = useState(queue);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [checks, setChecks] = useState({});
  const allChecked = QC_ITEMS.every(item => checks[item]);
  const doneCount  = QC_ITEMS.filter(item => checks[item]).length;

  async function handleAllocate(ref) {
    await onAllocate(ref);
    setChecks({});
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="HRM Supervisor" /> Allocation queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Review line-manager-approved claims and allocate them to the HR compiler for processing
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--purple-bg)', border: '0.5px solid var(--purple-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--purple-text)', fontWeight: 500 }}>
            <i className="ti ti-clipboard-list" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            Allocation checks — tick each before allocating to compiler:
          </div>
          <span style={{ fontSize: 11, color: allChecked ? 'var(--green-text)' : 'var(--purple-text)', fontWeight: 500 }}>
            {doneCount}/{QC_ITEMS.length} {allChecked ? '✓ All clear' : 'completed'}
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_ITEMS.map(item => (
            <div key={item}
              onClick={() => setChecks(prev => ({ ...prev, [item]: !prev[item] }))}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
                fontSize: 12, color: checks[item] ? 'var(--green-text)' : 'var(--purple-text)',
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
              <th>Purpose</th><th>KM</th><th>Amount</th><th>SLA</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {queue.length === 0 ? 'No claims awaiting allocation' : 'No records match the current filters.'}
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td><PersalTag code={c.persal} /></td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>{(c.dept || '').replace('GPG — ', '')}</td>
                <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td><SLABadge claim={c} /></td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" disabled={!allChecked}
                      title={allChecked ? '' : 'Tick all allocation checks above before allocating'}
                      onClick={() => handleAllocate(c.ref)}>
                      <i className="ti ti-arrow-right" style={{ fontSize: 13 }} /> Allocate to compiler
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
          targetOptions={FEEDBACK_TARGETS}
          onSubmit={onRequestFeedback}
          onClose={() => setFeedbackModal(null)}
        />
      )}
    </div>
  );
}
