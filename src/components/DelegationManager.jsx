import React, { useState, useEffect } from 'react';
import { Card, CardTitle, Btn, Field, FormRow } from './Shared';
import { api } from '../utils/api';

const ROLE_LABELS = {
  official: 'Official', supervisor: 'Supervisor', compiler: 'Compiler',
  verifier: 'Verifier', approver: 'HR Approver', hrs: 'HRS', admin: 'System Admin',
};

function today() { return new Date().toISOString().slice(0, 10); }
function isActive(d) {
  const t = today();
  return d.active && d.start_date <= t && d.end_date >= t;
}

function DelegationRow({ d, isMine, onRevoke }) {
  const active = isActive(d);
  const other  = isMine ? d.delegate : d.delegator;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '0.5px solid var(--border)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500 }}>
          {isMine ? `→ ${other?.name || '—'}` : `← ${other?.name || '—'}`}
          <span style={{
            marginLeft: 8, fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 10,
            background: active ? 'var(--green-bg)' : 'var(--gray-bg)',
            color: active ? 'var(--green-text)' : 'var(--text3)',
          }}>
            {active ? 'Active' : d.active ? 'Upcoming' : 'Revoked'}
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
          Role: <strong>{ROLE_LABELS[d.role] || d.role}</strong>
          {' · '}{d.start_date} to {d.end_date}
          {other?.persal && <span style={{ marginLeft: 8 }}>Persal {other.persal}</span>}
        </div>
        {d.reason && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Reason: {d.reason}
          </div>
        )}
      </div>
      {isMine && d.active && (
        <Btn size="sm" variant="danger" onClick={() => onRevoke(d.id)}>
          <i className="ti ti-x" style={{ fontSize: 12 }} /> Revoke
        </Btn>
      )}
    </div>
  );
}

function NewDelegationForm({ userRole, users, onSave, onCancel }) {
  const [delegateId, setDelegateId] = useState('');
  const [startDate,  setStartDate]  = useState(today());
  const [endDate,    setEndDate]    = useState('');
  const [reason,     setReason]     = useState('');
  const [busy, setBusy] = useState(false);

  const eligible = users.filter(u => u.role !== userRole); // anyone can receive a delegation

  async function handleSave() {
    if (!delegateId || !startDate || !endDate) return;
    setBusy(true);
    try {
      await onSave({ delegateId: parseInt(delegateId), role: userRole, startDate, endDate, reason });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ border: '0.5px solid var(--blue-text)', marginBottom: '1rem' }}>
      <CardTitle>New delegation</CardTitle>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
        You are delegating your <strong>{ROLE_LABELS[userRole]}</strong> approval authority. The person you choose will be able to act on your behalf during the specified period.
      </div>
      <FormRow cols={2}>
        <Field label="Delegate to *">
          <select value={delegateId} onChange={e => setDelegateId(e.target.value)}>
            <option value="">Select a person…</option>
            {eligible.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({ROLE_LABELS[u.role] || u.role}) — {u.persal || 'no persal'}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Reason (e.g. annual leave)">
          <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional" />
        </Field>
      </FormRow>
      <FormRow cols={2}>
        <Field label="Start date *">
          <input type="date" value={startDate} min={today()} onChange={e => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date *">
          <input type="date" value={endDate} min={startDate || today()} onChange={e => setEndDate(e.target.value)} />
        </Field>
      </FormRow>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn
          variant="primary"
          disabled={!delegateId || !startDate || !endDate || busy}
          onClick={handleSave}
        >
          {busy ? 'Saving…' : 'Create delegation'}
        </Btn>
        <Btn onClick={onCancel}>Cancel</Btn>
      </div>
    </Card>
  );
}

export default function DelegationManager({ user, toast }) {
  const [delegations, setDelegations] = useState([]);
  const [users,       setUsers]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);

  useEffect(() => {
    Promise.all([api.getDelegations(), api.getUsers()])
      .then(([dels, usrs]) => { setDelegations(dels); setUsers(usrs); })
      .catch(err => toast('Error loading delegations: ' + err.message))
      .finally(() => setLoading(false));
  }, [toast]);

  async function handleCreate(data) {
    try {
      const created = await api.createDelegation(data);
      setDelegations(prev => [created, ...prev]);
      setShowForm(false);
      toast('Delegation created — the person has been notified');
    } catch (err) {
      toast('Error: ' + err.message);
    }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this delegation? The person will no longer be able to act on your behalf.')) return;
    try {
      await api.revokeDelegation(id);
      setDelegations(prev => prev.map(d => d.id === id ? { ...d, active: false } : d));
      toast('Delegation revoked');
    } catch (err) {
      toast('Error: ' + err.message);
    }
  }

  const outgoing = delegations.filter(d => d.delegator?.id === user?.id || d.delegator_id === user?.id);
  const incoming = delegations.filter(d => d.delegate?.id  === user?.id || d.delegate_id  === user?.id);
  const activeIncoming = incoming.filter(isActive);

  const canDelegate = ['supervisor','compiler','verifier','approver','hrs'].includes(user?.role);

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>Delegation of authority</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Temporarily delegate your approval role to a colleague (e.g. during leave)
          </div>
        </div>
        {canDelegate && (
          <Btn variant="primary" onClick={() => setShowForm(v => !v)}>
            <i className="ti ti-plus" style={{ fontSize: 14 }} /> New delegation
          </Btn>
        )}
      </div>

      {/* Acting on behalf of banner */}
      {activeIncoming.length > 0 && (
        <div style={{
          background: 'var(--amber-bg)', border: '0.5px solid var(--amber-text)',
          borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '1rem',
        }}>
          <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--amber-text)', marginBottom: 6 }}>
            <i className="ti ti-user-check" style={{ fontSize: 15, marginRight: 6, verticalAlign: -2 }} />
            You are currently acting on behalf of:
          </div>
          {activeIncoming.map(d => (
            <div key={d.id} style={{ fontSize: 13, marginTop: 4 }}>
              <strong>{d.delegator?.name}</strong> — {ROLE_LABELS[d.role] || d.role} until {d.end_date}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <NewDelegationForm
          userRole={user?.role}
          users={users}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Loading…</div>
      ) : (
        <>
          <Card style={{ marginBottom: '1rem' }}>
            <CardTitle>Delegated by me ({outgoing.length})</CardTitle>
            {outgoing.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>
                No delegations created yet.
              </div>
            ) : outgoing.map(d => (
              <DelegationRow key={d.id} d={d} isMine={true} onRevoke={handleRevoke} />
            ))}
          </Card>

          <Card>
            <CardTitle>Delegated to me ({incoming.length})</CardTitle>
            {incoming.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text3)', padding: '8px 0' }}>
                No one has delegated authority to you.
              </div>
            ) : incoming.map(d => (
              <DelegationRow key={d.id} d={d} isMine={false} onRevoke={() => {}} />
            ))}
          </Card>
        </>
      )}
    </div>
  );
}
