import React, { useState, useCallback, useEffect } from 'react';
import { Card, Btn, PersalTag, RoleBadge, StatusBadge } from './Shared';
import SearchFilter from './SearchFilter';
import RejectModal from './RejectModal';
import SLABadge from './SLABadge';
import FeedbackRequestModal from './FeedbackRequestModal';
import SignaturePad from './SignaturePad';
import { api } from '../utils/api';

const QC_ITEMS = [
  'Line manager approved', 'Persal number confirmed',
  'Vehicle category & tariff rate noted', 'T118 circular uploaded',
  'Log book / trip log sheet attached', 'Dates & km verified',
];

const FEEDBACK_TARGETS = [
  { value: 'official',    label: 'Official (claimant)' },
  { value: 'supervisor',  label: 'Line Manager (Supervisor)' },
];

// ── Allocation modal — pick compiler, verifier, HR approver ──────────────────
function AllocationModal({ claim, onConfirm, onClose }) {
  const [users, setUsers]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [compilerId, setCompilerId]   = useState('');
  const [verifierId, setVerifierId]   = useState('');
  const [approverId, setApproverId]   = useState('');
  const [sigData, setSigData]         = useState(null);
  const [busy, setBusy]               = useState(false);

  useEffect(() => {
    api.getUsers()
      .then(u => { setUsers(u); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const compilers = users.filter(u => u.role === 'compiler');
  const verifiers = users.filter(u => u.role === 'verifier');
  const approvers = users.filter(u => u.role === 'approver');
  const canSubmit  = compilerId && verifierId && approverId;

  async function handleConfirm() {
    setBusy(true);
    try {
      if (sigData) {
        try { await api.saveSignature(claim.ref, 'sig_hrm_supervisor', sigData); } catch {}
      }
      await onConfirm({ compilerId, verifierId, approverId });
    } catch (err) {
      alert('Error: ' + err.message);
      setBusy(false);
    }
  }

  const selectStyle = {
    width: '100%', padding: '7px 10px', borderRadius: 'var(--radius)',
    border: '0.5px solid var(--border2)', background: 'var(--bg)',
    color: 'var(--text)', fontSize: 13,
  };
  const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 };
  const warnStyle  = { fontSize: 11, color: 'var(--red-text)', marginTop: 3 };

  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 560, background: 'var(--surface)',
        borderRadius: 'var(--radius-lg)', zIndex: 201,
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        padding: '1.5rem', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ fontSize: 15, fontWeight: 500 }}>
            <i className="ti ti-users-group" style={{ fontSize: 17, verticalAlign: -3, marginRight: 7 }} />
            Allocate claim — assign HR processors
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 18 }}>×</button>
        </div>

        {/* Claim summary */}
        <div style={{
          fontSize: 12, color: 'var(--purple-text)', marginBottom: '1.25rem',
          padding: '8px 12px', background: 'var(--purple-bg)', borderRadius: 'var(--radius)',
        }}>
          <strong>{claim.ref}</strong> · {claim.name} · {claim.dept?.replace('GPG — ', '') || '—'} · R {(claim.amount || 0).toFixed(2)}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text3)', fontSize: 13 }}>
            <i className="ti ti-loader-2" style={{ fontSize: 18, marginBottom: 6, display: 'block' }} />
            Loading users…
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Compiler */}
            <div>
              <label style={labelStyle}>HR Compiler *</label>
              <select value={compilerId} onChange={e => setCompilerId(e.target.value)} style={selectStyle}>
                <option value="">— select compiler —</option>
                {compilers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.persal ? ` (${u.persal})` : ''}</option>
                ))}
              </select>
              {compilers.length === 0 && (
                <div style={warnStyle}>No compiler users found — add users in User Management first</div>
              )}
            </div>

            {/* Verifier */}
            <div>
              <label style={labelStyle}>HR Verifier *</label>
              <select value={verifierId} onChange={e => setVerifierId(e.target.value)} style={selectStyle}>
                <option value="">— select verifier —</option>
                {verifiers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.persal ? ` (${u.persal})` : ''}</option>
                ))}
              </select>
              {verifiers.length === 0 && (
                <div style={warnStyle}>No verifier users found — add users in User Management first</div>
              )}
            </div>

            {/* HR Approver */}
            <div>
              <label style={labelStyle}>HR Approver *</label>
              <select value={approverId} onChange={e => setApproverId(e.target.value)} style={selectStyle}>
                <option value="">— select HR approver —</option>
                {approvers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}{u.persal ? ` (${u.persal})` : ''}</option>
                ))}
              </select>
              {approvers.length === 0 && (
                <div style={warnStyle}>No approver users found — add users in User Management first</div>
              )}
            </div>

            {/* HRM Supervisor signature */}
            <div>
              <label style={labelStyle}>HRM Supervisor sign-off (optional)</label>
              <SignaturePad
                label="Draw your signature"
                value={sigData}
                onChange={setSigData}
                height={100}
              />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <Btn onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant="success" onClick={handleConfirm} disabled={busy || !canSubmit || loading}>
            <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
            {busy ? 'Allocating…' : sigData ? 'Sign & allocate' : 'Allocate claim'}
          </Btn>
        </div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HrmSupervisorQueue({ claims, onAllocate, onReject, onViewClaim, onRequestFeedback }) {
  const queue = claims.filter(c => c.status === 'hrm_pending');
  const [filtered, setFiltered]   = useState(queue);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [rejectModal,   setRejectModal]   = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [allocModal,    setAllocModal]    = useState(null);
  const [checks, setChecks] = useState({});
  const allChecked = QC_ITEMS.every(item => checks[item]);
  const doneCount  = QC_ITEMS.filter(item => checks[item]).length;

  async function handleAllocate(ref, assignments) {
    await onAllocate(ref, assignments);
    setChecks({});
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="HRM Supervisor" /> Allocation queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Review line-manager-approved claims, assign HR processors, and allocate for processing
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--purple-bg)', border: '0.5px solid var(--purple-text)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: 'var(--purple-text)', fontWeight: 500 }}>
            <i className="ti ti-clipboard-list" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            Allocation checks — tick each before allocating:
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
                      title={allChecked ? '' : 'Tick all allocation checks above first'}
                      onClick={() => setAllocModal(c)}>
                      <i className="ti ti-users-group" style={{ fontSize: 13 }} /> Assign &amp; allocate
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
      {allocModal && (
        <AllocationModal
          claim={allocModal}
          onConfirm={async ({ compilerId, verifierId, approverId }) => {
            await handleAllocate(allocModal.ref, {
              assignedCompilerId:   compilerId,
              assignedVerifierId:   verifierId,
              assignedHrApproverId: approverId,
            });
            setAllocModal(null);
          }}
          onClose={() => setAllocModal(null)}
        />
      )}
    </div>
  );
}
