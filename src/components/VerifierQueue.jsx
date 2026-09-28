import React, { useState, useCallback } from 'react';
import { Card, Btn, PersalTag, RoleBadge } from './Shared';
import SearchFilter from './SearchFilter';
import RejectModal from './RejectModal';

const QC_ITEMS = [
  'Compilation accuracy checked', 'Allocation codes match Persal function 5.3.11',
  'Vehicle category & tariff match T118 circular', 'Late submission letter present (if applicable)',
  'Duplicate exception documented (if applicable)', 'Total km vs route plausibility',
];

export default function VerifierQueue({ claims, onVerify, onReject, onViewClaim }) {
  const queue = claims.filter(c => c.status === 'compiled');
  const [filtered, setFiltered] = useState(queue);
  const handleFilter = useCallback(r => setFiltered(r), []);
  const [rejectModal, setRejectModal] = useState(null);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 10 }}>
          <RoleBadge role="Verifier" /> Verifier queue
        </div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 6 }}>
          Verify compiled claims for completeness and accuracy before HR approval
        </div>
      </div>

      <Card style={{ marginBottom: '1rem', background: 'var(--blue-bg)', border: '0.5px solid var(--blue)' }}>
        <div style={{ fontSize: 12, color: 'var(--blue-text)', fontWeight: 500, marginBottom: 6 }}>
          <i className="ti ti-shield-check" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          Verification checklist:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px' }}>
          {QC_ITEMS.map(item => (
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
              <th>Ref</th><th>Official</th><th>Persal #</th><th>Business unit</th>
              <th>Category</th><th>KM</th><th>Amount</th><th>Flags</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  {queue.length === 0 ? 'No compiled claims to verify' : 'No records match the current filters.'}
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
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {c.isLateSubmission && (
                      <span style={{ fontSize: 10, background: 'var(--amber-bg)', color: 'var(--amber-text)', padding: '1px 5px', borderRadius: 4 }}>
                        Late
                      </span>
                    )}
                    {c.duplicateException && (
                      <span style={{ fontSize: 10, background: 'var(--purple-bg)', color: 'var(--purple-text)', padding: '1px 5px', borderRadius: 4 }}>
                        Dup exception
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <Btn size="sm" onClick={() => onViewClaim?.(c)}>
                      <i className="ti ti-eye" style={{ fontSize: 13 }} /> View
                    </Btn>
                    <Btn variant="success" size="sm" onClick={() => onVerify(c.ref)}>
                      <i className="ti ti-shield-check" style={{ fontSize: 13 }} /> Verify
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
        <RejectModal
          claim={rejectModal}
          onConfirm={onReject}
          onClose={() => setRejectModal(null)}
        />
      )}
    </div>
  );
}
