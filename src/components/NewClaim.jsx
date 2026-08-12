import React, { useState, useEffect } from 'react';
import { Card, CardTitle, Btn, FormRow, Field, SectionDivider, ActionBar, PersalTag } from './Shared';
import { TARIFFS, ENGINE_OPTIONS, ST_CODES } from '../data/constants';

const today = new Date().toISOString().split('T')[0];

const DOC_TYPES = [
  { id: 'attend',   label: 'Attendance register' },
  { id: 'invite',   label: 'Meeting invite / agenda' },
  { id: 'tariff',   label: 'Monthly tariffs' },
  { id: 'parking',  label: 'Parking slip' },
  { id: 'toll',     label: 'Toll receipt' },
  { id: 'meals',    label: 'Meal receipts' },
  { id: 'logsheet', label: 'Log sheet / trip authority' },
];

function getRate(engineIdx, bracket) {
  if (engineIdx === '') return 0;
  const t = TARIFFS[parseInt(engineIdx)];
  return t ? (bracket === 'more' ? t.r469 : t.r470) : 0;
}

// ── Trip table — groups legs by date ─────────────────────────────────────────

function TripTable({ trips, rate, onChange }) {
  function add(baseDate = today) {
    onChange([...trips, { id: Date.now(), date: baseDate, origin: '', dest: '', km: '' }]);
  }
  function addSameDay() {
    const last = trips[trips.length - 1];
    add(last?.date || today);
  }
  function remove(id) { onChange(trips.filter(t => t.id !== id)); }
  function update(id, field, val) {
    onChange(trips.map(t => t.id === id ? { ...t, [field]: val } : t));
  }

  // Group by date for visual separation
  const dates = [...new Set(trips.map(t => t.date))];

  return (
    <div>
      {dates.map(date => {
        const legs = trips.filter(t => t.date === date);
        return (
          <div key={date} style={{ marginBottom: 10 }}>
            {/* Date header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 8px', background: 'var(--blue-bg)',
              borderRadius: 'var(--radius)', marginBottom: 4,
            }}>
              <i className="ti ti-calendar" style={{ fontSize: 13, color: 'var(--blue-text)' }} />
              <input
                type="date"
                value={date}
                onChange={e => {
                  const newDate = e.target.value;
                  onChange(trips.map(t => t.date === date ? { ...t, date: newDate } : t));
                }}
                style={{ border: 'none', background: 'transparent', color: 'var(--blue-text)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: 'var(--blue-text)', opacity: 0.7 }}>
                {legs.length} leg{legs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Column headers — only on first date group */}
            {date === dates[0] && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 36px',
                gap: 6, padding: '0 8px 2px',
                fontSize: 11, fontWeight: 500, color: 'var(--text3)',
              }}>
                <span>From</span><span>To</span><span>KM</span><span>Rate/km</span><span></span>
              </div>
            )}

            {legs.map(t => (
              <div key={t.id} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 80px 100px 36px',
                gap: 6, alignItems: 'center',
                background: 'var(--surface2)', borderRadius: 'var(--radius)',
                padding: '6px 8px', marginBottom: 4,
              }}>
                <input value={t.origin} onChange={e => update(t.id, 'origin', e.target.value)} placeholder="Origin" />
                <input value={t.dest}   onChange={e => update(t.id, 'dest',   e.target.value)} placeholder="Destination" />
                <input type="number" value={t.km} onChange={e => update(t.id, 'km', e.target.value)} placeholder="0" />
                <input readOnly value={rate > 0 ? `R ${rate.toFixed(2)}` : '—'} />
                <button onClick={() => remove(t.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text3)', fontSize: 16, padding: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>×</button>
              </div>
            ))}
          </div>
        );
      })}

      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <Btn size="sm" onClick={addSameDay}>
          <i className="ti ti-plus" style={{ fontSize: 13 }} /> Add destination (same day)
        </Btn>
        <Btn size="sm" onClick={() => add()}>
          <i className="ti ti-calendar-plus" style={{ fontSize: 13 }} /> Add new day
        </Btn>
      </div>
    </div>
  );
}

// ── Document links ────────────────────────────────────────────────────────────

function DocLinks({ links, onChange }) {
  function add() { onChange([...links, { name: '', url: '' }]); }
  function remove(i) { onChange(links.filter((_, idx) => idx !== i)); }
  function update(i, field, val) {
    onChange(links.map((l, idx) => idx === i ? { ...l, [field]: val } : l));
  }

  return (
    <div>
      {links.map((l, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 30px', gap: 6, marginBottom: 6, alignItems: 'center' }}>
          <input
            placeholder="Document name"
            value={l.name}
            onChange={e => update(i, 'name', e.target.value)}
            style={{ fontSize: 12 }}
          />
          <input
            placeholder="Paste link (Google Drive, SharePoint, OneDrive…)"
            value={l.url}
            onChange={e => update(i, 'url', e.target.value)}
            style={{ fontSize: 12 }}
          />
          <button onClick={() => remove(i)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', fontSize: 16, padding: 0,
          }}>×</button>
        </div>
      ))}
      <button onClick={add} style={{
        background: 'none', border: '0.5px dashed var(--border2)',
        borderRadius: 'var(--radius)', padding: '4px 10px',
        fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
      }}>
        <i className="ti ti-link" style={{ fontSize: 12, marginRight: 4 }} />Add document link
      </button>
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

export default function NewClaim({ user, onSubmit, onSaveDraft, toast }) {
  const [name,       setName]       = useState(user?.name?.toUpperCase() || '');
  const [persal,     setPersal]     = useState(user?.persal || '');
  const [dept,       setDept]       = useState(user?.dept || 'GPG — Health');
  const [contact,    setContact]    = useState('');
  const [phone,      setPhone]      = useState('');
  const [dateStamp,  setDateStamp]  = useState(today);
  const [advanceYN,  setAdvanceYN]  = useState('no');
  const [advA,       setAdvA]       = useState('');
  const [advB,       setAdvB]       = useState('');
  const [vehicleType,setVehicleType]= useState('motor');
  const [engineIdx,  setEngineIdx]  = useState('');
  const [reg,        setReg]        = useState('');
  const [kmBracket,  setKmBracket]  = useState('more');
  const [purpose,    setPurpose]    = useState('');
  const [logsheet,   setLogsheet]   = useState('');
  const [trips,      setTrips]      = useState([{ id: 1, date: today, origin: '', dest: '', km: '' }]);
  const [docs,       setDocs]       = useState([]);
  const [docLinks,   setDocLinks]   = useState([]);
  const [allocAmts,  setAllocAmts]  = useState({});
  const [sigName,    setSigName]    = useState('');
  const [sigRank,    setSigRank]    = useState('');
  const [sigDate,    setSigDate]    = useState(today);
  const [errors,     setErrors]     = useState([]);

  const rate      = getRate(engineIdx, kmBracket);
  const totalKm   = trips.reduce((s, t) => s + (parseFloat(t.km) || 0), 0);
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

  function toggleDoc(id) {
    setDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  function buildPayload(status = 'pending') {
    const sortedTrips = [...trips].sort((a, b) => a.date.localeCompare(b.date));
    return {
      name: name.toUpperCase(), persal, dept, contact, phone,
      purpose, logsheet,
      dateFrom: sortedTrips[0]?.date || today,
      dateTo:   sortedTrips[sortedTrips.length - 1]?.date || today,
      vehicleType, engineIdx, kmBracket, reg,
      trips: sortedTrips.map(t => ({ ...t, dateFrom: t.date, dateTo: t.date })),
      km: totalKm, amount: totalClaim,
      docs,
      docLinks: docLinks.filter(l => l.url.trim()),
      advance: advanceYN === 'yes', advA: parseFloat(advA) || 0,
      advB: parseFloat(advB) || 0, advC,
      allocAmounts: { ...allocAmts },
      sigName, sigRank, sigDate,
      status,
    };
  }

  function validate() {
    const e = [];
    if (!name.trim())    e.push('Surname & initials is required');
    if (!persal.trim())  e.push('Persal number is required');
    if (!purpose.trim()) e.push('Purpose of travel is required');
    if (trips.length === 0 || !trips[0].km) e.push('At least one trip with km is required');
    return e;
  }

  function handleSubmit() {
    const e = validate();
    if (e.length) { setErrors(e); return; }
    setErrors([]);
    onSubmit(buildPayload('pending'));
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

      {/* Claimant */}
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
          <div style={{ padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--blue-text)' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            {tariffMsg}
          </div>
        )}
      </Card>

      {/* Trips */}
      <Card>
        <CardTitle><i className="ti ti-map-pin" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Trip details</CardTitle>
        <FormRow cols={2}>
          <Field label="Purpose of travel *"><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Site inspection, meeting attendance" /></Field>
          <Field label="Log sheet / trip authority ref"><input value={logsheet} onChange={e => setLogsheet(e.target.value)} placeholder="LS-2026-xxxx" /></Field>
        </FormRow>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
          Add each day's trips below. Use <strong>Add destination (same day)</strong> for multiple stops on the same date.
        </div>

        <TripTable trips={trips} rate={rate} onChange={setTrips} />

        {totalKm > 0 && (
          <div style={{
            marginTop: 10, padding: '8px 12px',
            background: 'var(--surface2)', borderRadius: 'var(--radius)',
            fontSize: 13, display: 'flex', justifyContent: 'space-between',
          }}>
            <span style={{ color: 'var(--text2)' }}>Total km: <strong>{totalKm.toFixed(1)} km</strong></span>
            {rate > 0 && <span style={{ color: 'var(--text2)' }}>Travel amount: <strong style={{ color: 'var(--blue-text)' }}>R {travelAmt.toFixed(2)}</strong></span>}
          </div>
        )}

        <SectionDivider>Supporting documents</SectionDivider>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 1rem', marginBottom: 12 }}>
          {DOC_TYPES.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '3px 0' }}>
              <input type="checkbox" style={{ width: 16, height: 16, flexShrink: 0 }} checked={docs.includes(d.id)} onChange={() => toggleDoc(d.id)} />
              {d.label}
            </label>
          ))}
        </div>

        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>
          Document links — paste Google Drive / SharePoint / OneDrive links
        </div>
        <DocLinks links={docLinks} onChange={setDocLinks} />
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
              type="number" style={{ textAlign: 'right' }} placeholder="0.00"
              value={allocAmts[s.code] || ''}
              onChange={e => setAllocAmts(prev => ({ ...prev, [s.code]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          {[
            { label: 'Total claim',              val: totalClaim },
            { label: 'Less: advance outstanding', val: advanceYN === 'yes' ? advC : 0 },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)', padding: '5px 0' }}>
              <span>{r.label}</span>
              <span style={{ fontFamily: 'var(--mono)' }}>R {r.val.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 500, padding: '10px 0 0', borderTop: '0.5px solid var(--border)' }}>
            <span>Nett amount payable</span>
            <span style={{ fontFamily: 'var(--mono)' }}>R {nett.toFixed(2)}</span>
          </div>
        </div>
      </Card>

      {/* Certificate */}
      <Card>
        <CardTitle><i className="ti ti-writing" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Certificate — applicant</CardTitle>
        <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.7, padding: 12, background: 'var(--surface2)', borderRadius: 'var(--radius)', marginBottom: '1rem' }}>
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
        <Btn onClick={() => onSaveDraft(buildPayload('draft'))}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> Save draft
        </Btn>
      </ActionBar>
    </div>
  );
}
