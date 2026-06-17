import React, { useState, useEffect } from 'react';
import { Card, CardTitle, Btn, FormRow, Field, SectionDivider, ActionBar, PersalTag } from './Shared';
import { TARIFFS, ENGINE_OPTIONS, ST_CODES } from '../data/constants';

const today = new Date().toISOString().split('T')[0];
const DOCS = [
  { id: 'attend',  label: 'Attendance register' },
  { id: 'invite',  label: 'Meeting invite' },
  { id: 'tariff',  label: 'Monthly tariffs' },
  { id: 'parking', label: 'Parking slip' },
  { id: 'toll',    label: 'Toll receipt' },
  { id: 'meals',   label: 'Meal receipts' },
  { id: 'logsheet',label: 'Log sheet / trip authority' },
];

function getRate(engineIdx, bracket) {
  if (engineIdx === '') return 0;
  const t = TARIFFS[parseInt(engineIdx)];
  return t ? (bracket === 'more' ? t.r469 : t.r470) : 0;
}

export default function NewClaim({ user, onSubmit, onSaveDraft, toast }) {
  const [name, setName] = useState(user?.name?.toUpperCase() || '');
  const [persal, setPersal] = useState(user?.persal || '');
  const [dept, setDept] = useState(user?.dept || 'GPG — Health');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [dateStamp, setDateStamp] = useState(today);
  const [advanceYN, setAdvanceYN] = useState('no');
  const [advA, setAdvA] = useState('');
  const [advB, setAdvB] = useState('');
  const [vehicleType, setVehicleType] = useState('motor');
  const [engineIdx, setEngineIdx] = useState('');
  const [reg, setReg] = useState('');
  const [kmBracket, setKmBracket] = useState('more');
  const [purpose, setPurpose] = useState('');
  const [logsheet, setLogsheet] = useState('');
  const [trips, setTrips] = useState([{ id: 1, dateFrom: today, dateTo: today, origin: '', dest: '', km: '' }]);
  const [docs, setDocs] = useState([]);
  const [allocAmts, setAllocAmts] = useState({});
  const [sigName, setSigName] = useState('');
  const [sigRank, setSigRank] = useState('');
  const [sigDate, setSigDate] = useState(today);
  const [errors, setErrors] = useState([]);

  const rate = getRate(engineIdx, kmBracket);
  const totalKm = trips.reduce((s, t) => s + (parseFloat(t.km) || 0), 0);
  const travelAmt = totalKm * rate;
  const allocTotal = Object.values(allocAmts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalClaim = travelAmt + allocTotal;
  const advC = (parseFloat(advA) || 0) - (parseFloat(advB) || 0);
  const nett = totalClaim - (advanceYN === 'yes' ? advC : 0);

  useEffect(() => {
    if (engineIdx !== '' && travelAmt > 0) {
      const code = kmBracket === 'more' ? '04069' : '04070';
      setAllocAmts(prev => ({ ...prev, [code]: travelAmt.toFixed(2) }));
    }
  }, [travelAmt, engineIdx, kmBracket]);

  function addTrip() {
    setTrips(prev => [...prev, { id: Date.now(), dateFrom: today, dateTo: today, origin: '', dest: '', km: '' }]);
  }
  function removeTrip(id) { setTrips(prev => prev.filter(t => t.id !== id)); }
  function updateTrip(id, field, val) {
    setTrips(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
  }
  function toggleDoc(id) {
    setDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  function validate() {
    const e = [];
    if (!name.trim()) e.push('Surname & initials is required');
    if (!persal.trim()) e.push('Persal number is required');
    if (!purpose.trim()) e.push('Purpose of travel is required');
    if (trips.length === 0 || !trips[0].km) e.push('At least one trip with km is required');
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (e.length) { setErrors(e); return; }
    setErrors([]);
    onSubmit({
      name: name.toUpperCase(), persal, dept, contact, phone,
      purpose, logsheet,
      dateFrom: trips[0]?.dateFrom || today,
      dateTo: trips[trips.length - 1]?.dateTo || today,
      vehicleType, engineIdx, kmBracket, reg,
      trips: trips.map(t => ({ ...t })),
      km: totalKm, amount: totalClaim,
      docs,
      advance: advanceYN === 'yes', advA: parseFloat(advA) || 0,
      advB: parseFloat(advB) || 0, advC,
      allocAmounts: { ...allocAmts },
      sigName, sigRank, sigDate,
    });
  }

  const tariffMsg = engineIdx !== ''
    ? `Tariff: R ${rate.toFixed(2)}/km — Persal code ${kmBracket === 'more' ? '0469' : '0470'} — ${TARIFFS[parseInt(engineIdx)]?.engine} — effective ${TARIFFS[parseInt(engineIdx)]?.from}`
    : null;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>New travel claim</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Persal Travel & Subsistence Claim — complete all sections
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{
          background: 'var(--red-bg)', border: '0.5px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '10px 14px',
          marginBottom: '1rem', fontSize: 13, color: 'var(--red-text)',
        }}>
          <strong>Please fix:</strong>
          <ul style={{ marginLeft: '1rem', marginTop: 4 }}>
            {errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Claimant details */}
      <Card>
        <CardTitle><i className="ti ti-user" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Claimant details</CardTitle>
        <FormRow cols={3}>
          <Field label="Surname & initials *"><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. DLAMINI T J" /></Field>
          <Field label="Persal number *"><input value={persal} onChange={e => setPersal(e.target.value)} placeholder="e.g. 20482345" /></Field>
          <Field label="Department"><input value={dept} onChange={e => setDept(e.target.value)} /></Field>
        </FormRow>
        <FormRow cols={3}>
          <Field label="Contact name"><input value={contact} onChange={e => setContact(e.target.value)} placeholder="Admin / line manager" /></Field>
          <Field label="Contact number"><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="011 xxx xxxx" /></Field>
          <Field label="Date stamp"><input type="date" value={dateStamp} onChange={e => setDateStamp(e.target.value)} /></Field>
        </FormRow>
        <FormRow cols={advanceYN === 'yes' ? 4 : 2}>
          <Field label="Advance taken?">
            <select value={advanceYN} onChange={e => setAdvanceYN(e.target.value)}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </Field>
          {advanceYN === 'yes' && <>
            <Field label="Advance amount (A) — R"><input type="number" value={advA} onChange={e => setAdvA(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Advance paid back (B) — R"><input type="number" value={advB} onChange={e => setAdvB(e.target.value)} placeholder="0.00" /></Field>
            <Field label="Outstanding (C = A − B) — R"><input readOnly value={advC.toFixed(2)} /></Field>
          </>}
        </FormRow>
      </Card>

      {/* Vehicle */}
      <Card>
        <CardTitle><i className="ti ti-car" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Vehicle details</CardTitle>
        <FormRow cols={4}>
          <Field label="Vehicle type">
            <select value={vehicleType} onChange={e => setVehicleType(e.target.value)}>
              <option value="motor">Private motor vehicle</option>
              <option value="motorbike">Motorbike</option>
            </select>
          </Field>
          <Field label="Engine capacity">
            <select value={engineIdx} onChange={e => setEngineIdx(e.target.value)}>
              {ENGINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Registration number"><input value={reg} onChange={e => setReg(e.target.value)} placeholder="GP xxx GP" /></Field>
          <Field label="Annual km bracket">
            <select value={kmBracket} onChange={e => setKmBracket(e.target.value)}>
              <option value="more">More than 8 000 km/yr (code 0469)</option>
              <option value="less">Less than 8 000 km/yr (code 0470)</option>
            </select>
          </Field>
        </FormRow>
        {tariffMsg && (
          <div style={{
            padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 'var(--radius)',
            fontSize: 13, color: 'var(--blue-text)',
          }}>
            <i className="ti ti-info-circle" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            {tariffMsg}
          </div>
        )}
      </Card>

      {/* Trip details */}
      <Card>
        <CardTitle><i className="ti ti-map-pin" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Trip details</CardTitle>
        <FormRow cols={2}>
          <Field label="Purpose of travel *"><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Site inspection, meeting attendance" /></Field>
          <Field label="Log sheet / trip authority reference"><input value={logsheet} onChange={e => setLogsheet(e.target.value)} placeholder="LS-2026-xxxx" /></Field>
        </FormRow>

        <div style={{ marginBottom: 8 }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 100px 40px',
            gap: 8, padding: '4px 0',
            fontSize: 11, fontWeight: 500, color: 'var(--text3)',
          }}>
            <span>Date from</span><span>Date to</span><span>From</span><span>To</span><span>KM</span><span>Rate/km</span><span></span>
          </div>
          {trips.map((t, i) => (
            <div key={t.id} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 80px 100px 40px',
              gap: 8, alignItems: 'center',
              background: 'var(--surface2)', borderRadius: 'var(--radius)',
              padding: 8, marginBottom: 6,
            }}>
              <input type="date" value={t.dateFrom} onChange={e => updateTrip(t.id, 'dateFrom', e.target.value)} />
              <input type="date" value={t.dateTo} onChange={e => updateTrip(t.id, 'dateTo', e.target.value)} />
              <input value={t.origin} onChange={e => updateTrip(t.id, 'origin', e.target.value)} placeholder="Origin" />
              <input value={t.dest} onChange={e => updateTrip(t.id, 'dest', e.target.value)} placeholder="Destination" />
              <input type="number" value={t.km} onChange={e => updateTrip(t.id, 'km', e.target.value)} placeholder="0" />
              <input readOnly value={rate > 0 ? `R ${rate.toFixed(2)}` : '—'} />
              <Btn size="sm" onClick={() => removeTrip(t.id)} style={{ padding: '4px 8px' }}>
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </Btn>
            </div>
          ))}
        </div>
        <Btn size="sm" onClick={addTrip}><i className="ti ti-plus" style={{ fontSize: 14 }} /> Add trip</Btn>

        <SectionDivider>Supporting documents</SectionDivider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 1rem', marginTop: 8 }}>
          {DOCS.map(d => (
            <label key={d.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 400, color: 'var(--text)',
              cursor: 'pointer', padding: '4px 0',
            }}>
              <input
                type="checkbox"
                style={{ width: 16, height: 16, flexShrink: 0 }}
                checked={docs.includes(d.id)}
                onChange={() => toggleDoc(d.id)}
              />
              {d.label}
            </label>
          ))}
        </div>
      </Card>

      {/* Persal allocation */}
      <Card>
        <CardTitle><i className="ti ti-calculator" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Persal allocation (function 5.3.11)</CardTitle>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 12 }}>
          Enter amounts for applicable codes. Travel allowance auto-populates from km × tariff.
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: '70px 1fr 70px 110px',
          gap: 8, padding: '4px 0',
          fontSize: 11, fontWeight: 500, color: 'var(--text3)',
          borderBottom: '0.5px solid var(--border)',
        }}>
          <span>Code</span><span>Description</span><span>SARS</span><span style={{ textAlign: 'right' }}>Amount (R)</span>
        </div>
        {ST_CODES.map(s => (
          <div key={s.code} style={{
            display: 'grid', gridTemplateColumns: '70px 1fr 70px 110px',
            gap: 8, alignItems: 'center',
            padding: '6px 0', borderBottom: '0.5px solid var(--border)',
          }}>
            <PersalTag code={s.code} />
            <span style={{ fontSize: 12, color: 'var(--text2)' }}>{s.desc}</span>
            <PersalTag code={s.sars} />
            <input
              type="number"
              style={{ textAlign: 'right' }}
              placeholder="0.00"
              value={allocAmts[s.code] || ''}
              onChange={e => setAllocAmts(prev => ({ ...prev, [s.code]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          {[
            { label: 'Total claim', val: totalClaim },
            { label: 'Less: advance outstanding', val: advanceYN === 'yes' ? advC : 0 },
          ].map((r, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: 13, color: 'var(--text2)', padding: '5px 0',
            }}>
              <span>{r.label}</span>
              <span style={{ fontFamily: 'var(--mono)' }}>R {r.val.toFixed(2)}</span>
            </div>
          ))}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontSize: 15, fontWeight: 500, padding: '10px 0 0',
            borderTop: '0.5px solid var(--border)',
          }}>
            <span>Nett amount payable</span>
            <span style={{ fontFamily: 'var(--mono)' }}>R {nett.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Certificate */}
      <Card>
        <CardTitle><i className="ti ti-writing" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Certificate — applicant</CardTitle>
        <div style={{
          fontSize: 12, color: 'var(--text2)', lineHeight: 1.7,
          padding: 12, background: 'var(--surface2)', borderRadius: 'var(--radius)',
          marginBottom: '1rem',
        }}>
          I certify that I was actually and necessarily employed travelling or detained on public service during the period(s) stated above, that the charges are in accordance with the authorised rate and that the incidental expenses have been actually and necessarily disbursed.
        </div>
        <FormRow cols={3}>
          <Field label="Applicant — type full name to sign"><input value={sigName} onChange={e => setSigName(e.target.value)} placeholder="Full name" /></Field>
          <Field label="Rank / grade"><input value={sigRank} onChange={e => setSigRank(e.target.value)} placeholder="e.g. D-1" /></Field>
          <Field label="Date"><input type="date" value={sigDate} onChange={e => setSigDate(e.target.value)} /></Field>
        </FormRow>
      </Card>

      <ActionBar>
        <Btn variant="primary" onClick={handleSubmit}>
          <i className="ti ti-send" style={{ fontSize: 15 }} /> Submit to supervisor
        </Btn>
        <Btn onClick={() => onSaveDraft({
          name: name.toUpperCase(), persal, dept, contact, phone,
          purpose, logsheet,
          dateFrom: trips[0]?.dateFrom || today,
          dateTo: trips[trips.length - 1]?.dateTo || today,
          vehicleType, engineIdx, kmBracket, reg,
          trips: trips.map(t => ({ ...t })),
          km: totalKm, amount: totalClaim,
          docs,
          advance: advanceYN === 'yes', advA: parseFloat(advA) || 0,
          advB: parseFloat(advB) || 0, advC,
          allocAmounts: { ...allocAmts },
          sigName, sigRank, sigDate,
        })}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> Save draft
        </Btn>
      </ActionBar>
    </div>
  );
}
