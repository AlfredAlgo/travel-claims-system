import React, { useState, useEffect, useRef } from 'react';
import { Card, CardTitle, Btn, FormRow, Field, SectionDivider, ActionBar, PersalTag } from './Shared';
import { VEHICLE_CATEGORIES, FUEL_TYPES, ENGINE_BANDS, WEIGHT_BANDS_G, REIMBURSEMENT_SCHEMES, ST_CODES } from '../data/constants';
import { buildAttachment } from '../utils/api';

const today = new Date().toISOString().split('T')[0];

const DOC_TYPES = [
  { id: 'attend',   label: 'Attendance register' },
  { id: 'invite',   label: 'Meeting invite / agenda' },
  { id: 'tariff',   label: 'Monthly tariffs' },
  { id: 'parking',  label: 'Parking slip' },
  { id: 'toll',     label: 'Toll receipt' },
  { id: 'meals',    label: 'Meal receipts' },
  { id: 'logsheet', label: 'Approved Memo' },
];

// Days between two ISO date strings
function daysBetween(dateStr, now = new Date()) {
  const d = new Date(dateStr);
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

// ── Trip table ────────────────────────────────────────────────────────────────

function TripTable({ trips, tariffRate, onChange }) {
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

  const dates = [...new Set(trips.map(t => t.date))];
  const rate = parseFloat(tariffRate) || 0;

  return (
    <div>
      {dates.map(date => {
        const legs = trips.filter(t => t.date === date);
        return (
          <div key={date} style={{ marginBottom: 10 }}>
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
                  const nd = e.target.value;
                  onChange(trips.map(t => t.date === date ? { ...t, date: nd } : t));
                }}
                style={{ border: 'none', background: 'transparent', color: 'var(--blue-text)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 11, color: 'var(--blue-text)', opacity: 0.7 }}>
                {legs.length} leg{legs.length !== 1 ? 's' : ''}
              </span>
            </div>

            {date === dates[0] && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 80px 110px 36px',
                gap: 6, padding: '0 8px 2px',
                fontSize: 11, fontWeight: 500, color: 'var(--text3)',
              }}>
                <span>From</span><span>To</span><span>KM</span><span>Amount (R)</span><span></span>
              </div>
            )}

            {legs.map(t => {
              const legAmt = rate > 0 ? (rate * (parseFloat(t.km) || 0)) : 0;
              return (
                <div key={t.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 80px 110px 36px',
                  gap: 6, alignItems: 'center',
                  background: 'var(--surface2)', borderRadius: 'var(--radius)',
                  padding: '6px 8px', marginBottom: 4,
                }}>
                  <input value={t.origin} onChange={e => update(t.id, 'origin', e.target.value)} placeholder="Origin" />
                  <input value={t.dest}   onChange={e => update(t.id, 'dest',   e.target.value)} placeholder="Destination" />
                  <input type="number" value={t.km} onChange={e => update(t.id, 'km', e.target.value)} placeholder="0" />
                  <input readOnly value={legAmt > 0 ? `R ${legAmt.toFixed(2)}` : '—'} style={{ color: 'var(--text3)' }} />
                  <button onClick={() => remove(t.id)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text3)', fontSize: 16, padding: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              );
            })}
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

// ── File upload component ─────────────────────────────────────────────────────

function FileUpload({ fieldKey, label, accept, files, onAdd, onRemove, hint }) {
  const inputRef = useRef();

  function handleChange(e) {
    const picked = Array.from(e.target.files);
    picked.forEach(f => onAdd(f, fieldKey));
    e.target.value = '';
  }

  const myFiles = files.filter(f => f.fieldKey === fieldKey);

  return (
    <div style={{ marginBottom: 6 }}>
      {label && <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 4 }}>{label}</div>}
      {hint && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6 }}>{hint}</div>}
      {myFiles.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 8px', background: 'var(--blue-bg)',
          borderRadius: 'var(--radius)', marginBottom: 4, fontSize: 12,
        }}>
          <i className="ti ti-paperclip" style={{ fontSize: 13, color: 'var(--blue-text)' }} />
          <span style={{ flex: 1, color: 'var(--blue-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f.fileName}
          </span>
          <span style={{ color: 'var(--text3)', fontSize: 11 }}>
            {f.fileSize > 0 ? `${(f.fileSize / 1024).toFixed(0)} KB` : ''}
          </span>
          <button onClick={() => onRemove(fieldKey, i)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text3)', fontSize: 15, padding: 0,
          }}>×</button>
        </div>
      ))}
      <input
        ref={inputRef} type="file"
        accept={accept || '.pdf,.jpg,.jpeg,.png,.doc,.docx'}
        style={{ display: 'none' }}
        onChange={handleChange}
        multiple
      />
      <button
        onClick={() => inputRef.current?.click()}
        style={{
          background: 'none', border: '0.5px dashed var(--border2)',
          borderRadius: 'var(--radius)', padding: '5px 12px',
          fontSize: 12, color: 'var(--text2)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        <i className="ti ti-upload" style={{ fontSize: 13 }} />
        Upload file
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

  // New vehicle fields (T118)
  const [vehicleCategory,     setVehicleCategory]     = useState('A');
  const [fuelType,            setFuelType]            = useState('petrol');
  const [engineBand,          setEngineBand]          = useState('');
  const [weightBand,          setWeightBand]          = useState('');
  const [reimbursementScheme, setReimbursementScheme] = useState('private');
  const [tariffRate,          setTariffRate]          = useState('');
  const [persalRef,           setPersalRef]           = useState('T118');

  const [reg,        setReg]        = useState('');
  const [purpose,    setPurpose]    = useState('');
  const [logsheet,   setLogsheet]   = useState('');
  const [trips,      setTrips]      = useState([{ id: 1, date: today, origin: '', dest: '', km: '' }]);
  const [docs,       setDocs]       = useState([]);
  const [attachments, setAttachments] = useState([]); // { fieldKey, fileName, fileSize, mimeType, fileData }
  const [allocAmts,  setAllocAmts]  = useState({});
  const [sigName,    setSigName]    = useState('');
  const [sigRank,    setSigRank]    = useState('');
  const [sigDate,    setSigDate]    = useState(today);

  // Duplicate exception
  const [dupConflict,    setDupConflict]    = useState(null); // { duplicateRef, message }
  const [dupException,   setDupException]   = useState(false);
  const [dupExNote,      setDupExNote]      = useState('');

  const [errors,  setErrors]  = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Derived
  const rate      = parseFloat(tariffRate) || 0;
  const totalKm   = trips.reduce((s, t) => s + (parseFloat(t.km) || 0), 0);
  const travelAmt = rate > 0 ? rate * totalKm : 0;
  const allocTotal = Object.values(allocAmts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const totalClaim = travelAmt + allocTotal;
  const advC = (parseFloat(advA) || 0) - (parseFloat(advB) || 0);
  const nett = totalClaim - (advanceYN === 'yes' ? advC : 0);

  // Late submission detection
  const earliestDate = trips.length > 0 ? trips.reduce((min, t) => {
    return (!min || t.date < min) ? t.date : min;
  }, null) : null;
  const isLate = earliestDate ? daysBetween(earliestDate) > 30 : false;

  // Engine band options depend on category
  const isElectric   = vehicleCategory === 'G';
  const isMotorbike  = vehicleCategory === 'F';
  const hasFuelType  = !isElectric && !isMotorbike; // F is always petrol, G has no fuel type
  const bandOptions  = isElectric ? WEIGHT_BANDS_G : (ENGINE_BANDS[vehicleCategory] || []);

  // Reset band when category changes
  useEffect(() => {
    setEngineBand('');
    setWeightBand('');
  }, [vehicleCategory]);

  // Auto-populate travel allowance code from tariff rate
  useEffect(() => {
    if (travelAmt > 0) {
      const code = reimbursementScheme === 'private' ? '04069' : '04040';
      setAllocAmts(prev => ({ ...prev, [code]: travelAmt.toFixed(2) }));
    }
  }, [travelAmt, reimbursementScheme]);

  function toggleDoc(id) {
    setDocs(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
  }

  async function handleFileAdd(file, fieldKey) {
    if (file.size > 10 * 1024 * 1024) {
      toast('File too large — maximum 10 MB per file');
      return;
    }
    try {
      const att = await buildAttachment(file, fieldKey);
      setAttachments(prev => [...prev, att]);
    } catch {
      toast('Failed to read file');
    }
  }

  function handleFileRemove(fieldKey, idx) {
    let count = -1;
    setAttachments(prev => prev.filter(f => {
      if (f.fieldKey !== fieldKey) return true;
      count++;
      return count !== idx;
    }));
  }

  function buildPayload(status = 'pending') {
    const sortedTrips = [...trips].sort((a, b) => a.date.localeCompare(b.date));
    return {
      name: name.toUpperCase(), persal, dept, contact, phone,
      purpose, logsheet,
      dateFrom: sortedTrips[0]?.date || today,
      dateTo:   sortedTrips[sortedTrips.length - 1]?.date || today,
      vehicleCategory, fuelType,
      engineBand: isElectric ? '' : engineBand,
      weightBand: isElectric ? weightBand : '',
      reimbursementScheme, tariffRate: parseFloat(tariffRate) || 0,
      persalRef,
      reg,
      trips: sortedTrips.map(t => ({ ...t, dateFrom: t.date, dateTo: t.date })),
      km: totalKm, amount: totalClaim,
      docs, docLinks: [],
      attachments,
      duplicateException: dupException, duplicateExceptionNote: dupExNote,
      isLateSubmission: isLate,
      lateSubmissionReason: isLate ? 'Travel date > 30 days ago' : '',
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
    if (!tariffRate || parseFloat(tariffRate) <= 0) e.push('Tariff rate (R/km) is required');
    if (isLate) {
      const hasLetter = attachments.some(a => a.fieldKey === 'late_letter');
      if (!hasLetter) e.push('Late Submission Letter must be uploaded (travel was more than 30 days ago)');
    }
    if (dupException) {
      if (!dupExNote.trim()) e.push('Duplicate exception justification is required');
      const hasLetter = attachments.some(a => a.fieldKey === 'duplicate_letter');
      if (!hasLetter) e.push('Duplicate exception letter must be uploaded');
    }
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (e.length) { setErrors(e); return; }
    setErrors([]);
    setSubmitting(true);
    try {
      await onSubmit(buildPayload('pending'));
    } catch (err) {
      // Handle 409 duplicate conflict
      if (err.status === 409 && err.data) {
        setDupConflict(err.data);
        setDupException(false);
        setDupExNote('');
      } else {
        toast('Error: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const tariffInfo = rate > 0
    ? `Tariff: R ${rate.toFixed(4)}/km · Circular ${persalRef || '—'} · Persal scheme: ${reimbursementScheme}`
    : null;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: 20, fontWeight: 500 }}>New travel claim</div>
        <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
          Persal Travel & Subsistence Claim — complete all sections
        </div>
      </div>

      {isLate && (
        <div style={{
          background: 'var(--amber-bg)', border: '0.5px solid var(--amber-text)',
          borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: '1rem',
          fontSize: 13, color: 'var(--amber-text)',
        }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          <strong>Late submission:</strong> The earliest trip date is more than 30 days ago.
          A Late Submission Letter is required — upload it in the Supporting Documents section below.
        </div>
      )}

      {dupConflict && !dupException && (
        <div style={{
          background: 'var(--red-bg)', border: '0.5px solid var(--red)',
          borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: '1rem',
          fontSize: 13, color: 'var(--red-text)',
        }}>
          <i className="ti ti-alert-circle" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
          <strong>Duplicate claim detected</strong> — existing ref: <strong>{dupConflict.duplicateRef}</strong>
          <div style={{ marginTop: 6, fontSize: 12 }}>{dupConflict.message}</div>
          <div style={{ marginTop: 10 }}>
            <Btn size="sm" variant="danger" onClick={() => { setDupException(true); setDupConflict(null); }}>
              This is a different trip — submit exception
            </Btn>
            <Btn size="sm" style={{ marginLeft: 8 }} onClick={() => setDupConflict(null)}>
              Cancel
            </Btn>
          </div>
        </div>
      )}

      {dupException && (
        <div style={{
          background: 'var(--amber-bg)', border: '0.5px solid var(--amber-text)',
          borderRadius: 'var(--radius)', padding: '12px 14px', marginBottom: '1rem',
          fontSize: 13,
        }}>
          <div style={{ fontWeight: 500, color: 'var(--amber-text)', marginBottom: 8 }}>
            <i className="ti ti-shield-exclamation" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            Duplicate exception — both fields are required
          </div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>
            Written justification *
          </label>
          <textarea
            value={dupExNote}
            onChange={e => setDupExNote(e.target.value)}
            placeholder="Explain why this trip is different from the existing claim…"
            rows={3}
            style={{
              width: '100%', boxSizing: 'border-box', resize: 'vertical',
              padding: '8px 10px', borderRadius: 'var(--radius)',
              border: '0.5px solid var(--border2)', fontSize: 13,
              background: 'var(--bg)', color: 'var(--text)',
              fontFamily: 'inherit', marginBottom: 8,
            }}
          />
          <FileUpload
            fieldKey="duplicate_letter"
            label="Exception letter (PDF) *"
            accept=".pdf,.doc,.docx"
            files={attachments}
            onAdd={handleFileAdd}
            onRemove={handleFileRemove}
          />
          <button onClick={() => { setDupException(false); setDupExNote(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
            Cancel exception
          </button>
        </div>
      )}

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
          <Field label="Business unit"><input value={dept} onChange={e => setDept(e.target.value)} /></Field>
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
        <CardTitle><i className="ti ti-car" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Vehicle details — Circular {persalRef || 'T118'}</CardTitle>
        <FormRow cols={2}>
          <Field label="Vehicle category *">
            <select value={vehicleCategory} onChange={e => setVehicleCategory(e.target.value)}>
              {VEHICLE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Registration number *"><input value={reg} onChange={e => setReg(e.target.value)} placeholder="GP xxx GP" /></Field>
        </FormRow>
        <FormRow cols={hasFuelType ? 3 : 2}>
          {hasFuelType && (
            <Field label="Fuel type">
              <select value={fuelType} onChange={e => setFuelType(e.target.value)}>
                {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </Field>
          )}
          <Field label={isElectric ? 'Weight band (GVM)' : 'Engine band'}>
            <select
              value={isElectric ? weightBand : engineBand}
              onChange={e => isElectric ? setWeightBand(e.target.value) : setEngineBand(e.target.value)}
            >
              <option value="">— select —</option>
              {bandOptions.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
            </select>
          </Field>
          <Field label="Reimbursement scheme">
            <select value={reimbursementScheme} onChange={e => setReimbursementScheme(e.target.value)}>
              {REIMBURSEMENT_SCHEMES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>
        </FormRow>
        <FormRow cols={2}>
          <Field label="Tariff rate (R/km) *">
            <input
              type="number" step="0.0001" min="0"
              value={tariffRate}
              onChange={e => setTariffRate(e.target.value)}
              placeholder="e.g. 4.56"
            />
          </Field>
          <Field label="Circular / Persal ref">
            <input
              value={persalRef}
              onChange={e => setPersalRef(e.target.value)}
              placeholder="e.g. T118"
            />
          </Field>
        </FormRow>
        {tariffInfo && (
          <div style={{ padding: '8px 12px', background: 'var(--blue-bg)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--blue-text)' }}>
            <i className="ti ti-info-circle" style={{ fontSize: 15, verticalAlign: -2, marginRight: 6 }} />
            {tariffInfo}
          </div>
        )}
      </Card>

      {/* Trips */}
      <Card>
        <CardTitle><i className="ti ti-map-pin" style={{ fontSize: 16, verticalAlign: -2, marginRight: 6 }} />Trip details</CardTitle>
        <FormRow cols={2}>
          <Field label="Purpose of travel *"><input value={purpose} onChange={e => setPurpose(e.target.value)} placeholder="e.g. Site inspection, meeting attendance" /></Field>
          <Field label="Approved Memo ref"><input value={logsheet} onChange={e => setLogsheet(e.target.value)} placeholder="AM-2026-xxxx" /></Field>
        </FormRow>

        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
          Add each day's trips. Use <strong>Add destination (same day)</strong> for multiple stops on the same date.
        </div>

        <TripTable trips={trips} tariffRate={tariffRate} onChange={setTrips} />

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
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 1rem', marginBottom: 14 }}>
          {DOC_TYPES.map(d => (
            <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', padding: '3px 0' }}>
              <input type="checkbox" style={{ width: 16, height: 16, flexShrink: 0 }} checked={docs.includes(d.id)} onChange={() => toggleDoc(d.id)} />
              {d.label}
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <FileUpload
            fieldKey="general"
            label="Supporting documents"
            files={attachments}
            onAdd={handleFileAdd}
            onRemove={handleFileRemove}
            hint="Upload PDFs, images, or Word documents"
          />
          {isLate && (
            <FileUpload
              fieldKey="late_letter"
              label="Late Submission Letter *"
              accept=".pdf,.doc,.docx"
              files={attachments}
              onAdd={handleFileAdd}
              onRemove={handleFileRemove}
              hint="Required — travel date is more than 30 days ago"
            />
          )}
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
              type="number" style={{ textAlign: 'right' }} placeholder="0.00"
              value={allocAmts[s.code] || ''}
              onChange={e => setAllocAmts(prev => ({ ...prev, [s.code]: e.target.value }))}
            />
          </div>
        ))}

        <div style={{ marginTop: 12 }}>
          {[
            { label: 'Total claim',               val: totalClaim },
            { label: 'Less: advance outstanding',  val: advanceYN === 'yes' ? advC : 0 },
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
        <Btn variant="primary" onClick={handleSubmit} disabled={submitting}>
          <i className="ti ti-send" style={{ fontSize: 15 }} /> {submitting ? 'Submitting…' : 'Submit to supervisor'}
        </Btn>
        <Btn onClick={() => onSaveDraft(buildPayload('draft'))} disabled={submitting}>
          <i className="ti ti-device-floppy" style={{ fontSize: 15 }} /> Save draft
        </Btn>
      </ActionBar>
    </div>
  );
}
