import React, { useState, useEffect } from 'react';
import { Card, CardTitle, Btn, Field, FormRow, PersalTag } from './Shared';
import { ST_CODES, VEHICLE_CATEGORIES, FUEL_TYPES, REIMBURSEMENT_SCHEMES } from '../data/constants';
import { api } from '../utils/api';

function NewScheduleForm({ onSave, onCancel }) {
  const [circularRef,    setCircularRef]    = useState('');
  const [effectiveDate,  setEffectiveDate]  = useState('');
  const [notes,          setNotes]          = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    if (!circularRef.trim() || !effectiveDate) return;
    setBusy(true);
    try {
      await onSave({ circularRef, effectiveDate, notes });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card style={{ border: '0.5px solid var(--blue-text)', marginBottom: '1rem' }}>
      <CardTitle>New tariff schedule</CardTitle>
      <FormRow cols={3}>
        <Field label="Circular ref *">
          <input value={circularRef} onChange={e => setCircularRef(e.target.value)} placeholder="e.g. T118" />
        </Field>
        <Field label="Effective date *">
          <input type="date" value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
        </Field>
        <Field label="Notes">
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional description" />
        </Field>
      </FormRow>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <Btn variant="primary" disabled={!circularRef.trim() || !effectiveDate || busy} onClick={handleSave}>
          {busy ? 'Saving…' : 'Create schedule'}
        </Btn>
        <Btn onClick={onCancel}>Cancel</Btn>
      </div>
    </Card>
  );
}

function RateRow({ rate, onDelete }) {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '60px 70px 110px 100px 80px 90px 32px',
      gap: 8, alignItems: 'center', padding: '5px 0',
      borderBottom: '0.5px solid var(--border)', fontSize: 12,
    }}>
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>Cat {rate.category}</span>
      <span style={{ color: 'var(--text2)' }}>{rate.fuel_type}</span>
      <span style={{ color: 'var(--text2)' }}>{rate.band}</span>
      <span style={{ color: 'var(--text2)', fontSize: 11 }}>{rate.scheme}</span>
      <span style={{ fontFamily: 'var(--mono)' }}>R {parseFloat(rate.rate_rand).toFixed(4)}</span>
      <PersalTag code={rate.persal_ref || '—'} />
      <button onClick={() => onDelete(rate.id)} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'var(--text3)', fontSize: 15, padding: 0,
      }}>×</button>
    </div>
  );
}

export default function Tariffs() {
  const [schedules, setSchedules] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [error,     setError]     = useState('');

  useEffect(() => {
    api.getTariffSchedules()
      .then(setSchedules)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(data) {
    try {
      const s = await api.createTariffSchedule(data);
      setSchedules(prev => [s, ...prev]);
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this tariff schedule? This cannot be undone.')) return;
    try {
      await api.deleteTariffSchedule(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>Tariff schedules</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            Versioned tariff schedules per DoT circular — officials manually enter rates when creating claims
          </div>
        </div>
        <Btn variant="primary" onClick={() => setShowForm(v => !v)}>
          <i className="ti ti-plus" style={{ fontSize: 14 }} /> New schedule
        </Btn>
      </div>

      {error && (
        <div style={{ background: 'var(--red-bg)', borderRadius: 'var(--radius)', padding: '8px 12px', marginBottom: '1rem', fontSize: 13, color: 'var(--red-text)' }}>
          {error}
        </div>
      )}

      {showForm && (
        <NewScheduleForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>Loading…</div>
      ) : schedules.length === 0 ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
            <i className="ti ti-table" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
            <p style={{ fontSize: 13 }}>No tariff schedules yet. Create one to get started.</p>
          </div>
        </Card>
      ) : schedules.map(s => (
        <Card key={s.id} style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                <PersalTag code={s.circular_ref} />
                Circular {s.circular_ref}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
                Effective: <strong>{s.effective_date}</strong>
                {s.notes && <span style={{ marginLeft: 12 }}>{s.notes}</span>}
              </div>
            </div>
            <Btn size="sm" variant="danger" onClick={() => handleDelete(s.id)}>
              <i className="ti ti-trash" style={{ fontSize: 13 }} /> Delete
            </Btn>
          </div>

          {(s.tariff_rates || []).length > 0 ? (
            <>
              <div style={{
                display: 'grid', gridTemplateColumns: '60px 70px 110px 100px 80px 90px 32px',
                gap: 8, padding: '4px 0', fontSize: 11, fontWeight: 500, color: 'var(--text3)',
                borderBottom: '0.5px solid var(--border)',
              }}>
                <span>Cat</span><span>Fuel</span><span>Engine band</span><span>Scheme</span><span>Rate R/km</span><span>Persal ref</span><span></span>
              </div>
              {s.tariff_rates.map(r => (
                <RateRow key={r.id} rate={r} onDelete={() => {}} />
              ))}
            </>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text3)', padding: '8px 0' }}>
              No rate rows — officials will reference this circular and enter rates manually.
            </div>
          )}
        </Card>
      ))}

      <Card>
        <CardTitle>S&T allowance codes — Persal function 5.3.11</CardTitle>
        <table>
          <thead>
            <tr><th>Persal code</th><th>Description</th><th>SARS code</th></tr>
          </thead>
          <tbody>
            {ST_CODES.map(s => (
              <tr key={s.code}>
                <td><PersalTag code={s.code} /></td>
                <td>{s.desc}</td>
                <td><PersalTag code={s.sars} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardTitle>Vehicle categories — T118</CardTitle>
        <table>
          <thead>
            <tr><th>Category</th><th>Description</th></tr>
          </thead>
          <tbody>
            {VEHICLE_CATEGORIES.map(c => (
              <tr key={c.value}>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 500 }}>{c.value}</td>
                <td>{c.label.replace(`Category ${c.value} — `, '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
