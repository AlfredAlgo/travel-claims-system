import React, { useState, useEffect } from 'react';
import { StatusBadge, Btn } from './Shared';
import { STATUS_META, TARIFFS, ST_CODES } from '../data/constants';
import { api } from '../utils/api';

// ── PDF export ───────────────────────────────────────────────────────────────

async function downloadPDF(claim, history) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  // Header bar
  doc.setFillColor(24, 95, 165);
  doc.rect(0, 0, 210, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont(undefined, 'bold');
  doc.text('GAUTENG PROVINCIAL GOVERNMENT', 105, 9, { align: 'center' });
  doc.setFontSize(9); doc.setFont(undefined, 'normal');
  doc.text('Persal Travel & Subsistence Claim — Z 584', 105, 16, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Ref line
  doc.setFontSize(9);
  doc.text(`Claim Ref: ${claim.ref}`, 14, 29);
  doc.text(`Status: ${STATUS_META[claim.status]?.label || claim.status}`, 90, 29);
  doc.text(`Submitted: ${(claim.createdAt || '').slice(0, 10)}`, 155, 29);

  const th = { fillColor: [230, 241, 251], textColor: [24, 95, 165], fontStyle: 'bold', fontSize: 8 };

  // Claimant details
  autoTable(doc, {
    startY: 34,
    head: [['CLAIMANT DETAILS', '', '', '']],
    body: [
      ['Surname & Initials', claim.name, 'Persal Number', claim.persal],
      ['Department', claim.dept || '—', 'Contact', claim.contact || '—'],
      ['Phone', claim.phone || '—', 'Advance Taken', claim.advance ? `Yes (R ${(claim.advA||0).toFixed(2)} advance)` : 'No'],
    ],
    theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: th,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 }, 2: { fontStyle: 'bold', cellWidth: 42 } },
  });

  // Vehicle details
  const engineLabel = TARIFFS[parseInt(claim.engineIdx)]?.engine || '—';
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: [['VEHICLE DETAILS', '', '', '']],
    body: [
      ['Vehicle Type', claim.vehicleType === 'motor' ? 'Private Motor Vehicle' : 'Motorbike', 'Engine Capacity', engineLabel],
      ['Registration', claim.reg || '—', 'Annual KM Bracket', claim.kmBracket === 'more' ? '> 8 000 km/yr (R.469)' : '≤ 8 000 km/yr (R.470)'],
    ],
    theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: th,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 42 }, 2: { fontStyle: 'bold', cellWidth: 42 } },
  });

  // Trip details
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: [['TRIP DETAILS — Purpose: ' + (claim.purpose || '—'), '', '', '', '']],
    body: [
      ...(claim.trips || []).map((t, i) => [`Trip ${i + 1}`, t.dateFrom || '—', `${t.origin} → ${t.dest}`, `${t.km} km`, '']),
      [{ content: 'Log sheet ref', styles: { fontStyle: 'bold' } }, { content: claim.logsheet || '—', colSpan: 2 }, { content: 'TOTAL KM', styles: { fontStyle: 'bold' } }, `${claim.km} km`],
    ],
    theme: 'striped', styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: th,
  });

  // Persal allocation
  const allocEntries = Object.entries(claim.allocAmounts || {}).filter(([, v]) => v > 0);
  if (allocEntries.length > 0) {
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 4,
      head: [['PERSAL ALLOCATION (Function 5.3.11)', '', '']],
      body: allocEntries.map(([code, amt]) => {
        const st = ST_CODES.find(s => s.code === code);
        return [code, st?.desc || '—', `R ${parseFloat(amt).toFixed(2)}`];
      }),
      theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: th,
      columnStyles: { 0: { cellWidth: 22, fontFamily: 'courier' }, 2: { cellWidth: 30, halign: 'right' } },
    });
  }

  // Financial summary
  const nett = (claim.amount || 0) - (claim.advance ? claim.advC || 0 : 0);
  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 4,
    head: [['FINANCIAL SUMMARY', '']],
    body: [
      ['Total claim amount', `R ${(claim.amount || 0).toFixed(2)}`],
      ['Less: advance outstanding (C = A − B)', `R ${(claim.advance ? claim.advC || 0 : 0).toFixed(2)}`],
      [{ content: 'Nett amount payable', styles: { fontStyle: 'bold' } }, { content: `R ${nett.toFixed(2)}`, styles: { fontStyle: 'bold' } }],
    ],
    theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: th,
    columnStyles: { 0: { cellWidth: 120 }, 1: { halign: 'right' } },
  });

  // Status history
  if (history.length > 0) {
    let y = doc.lastAutoTable.finalY + 4;
    if (y > 245) { doc.addPage(); y = 14; }
    autoTable(doc, {
      startY: y,
      head: [['STATUS HISTORY', '', '', '']],
      body: history.map(h => [
        new Date(h.created_at).toLocaleString('en-ZA'),
        `${STATUS_META[h.from_status]?.label || '—'} → ${STATUS_META[h.to_status]?.label || h.to_status}`,
        h.users?.name || '—',
        h.note || '—',
      ]),
      theme: 'striped', styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: th,
    });
  }

  // Certificate block
  let y = doc.lastAutoTable.finalY + 6;
  if (y > 255) { doc.addPage(); y = 14; }
  doc.setFontSize(8); doc.setFont(undefined, 'italic');
  doc.setTextColor(80);
  doc.text('I certify that I was actually and necessarily employed travelling on public service during the period stated above and that the charges are in accordance with the authorised rate.', 14, y, { maxWidth: 182 });
  doc.setFont(undefined, 'normal'); doc.setTextColor(0);
  doc.text(`Signed: ${claim.sigName || '—'}`, 14, y + 10);
  doc.text(`Rank: ${claim.sigRank || '—'}`, 80, y + 10);
  doc.text(`Date: ${claim.sigDate || '—'}`, 150, y + 10);
  if (claim.mandate) { doc.text(`Persal mandate: ${claim.mandate}`, 14, y + 16); }

  // Footer on every page
  const total = doc.internal.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(160);
    doc.text(`GPG Persal Travel Claims · ${claim.ref} · Page ${i} of ${total}`, 105, 292, { align: 'center' });
  }

  doc.save(`${claim.ref}.pdf`);
}

// ── Status timeline ──────────────────────────────────────────────────────────

function Timeline({ history, loading }) {
  if (loading) return <div style={{ color: 'var(--text3)', fontSize: 13, padding: '1rem 0' }}>Loading history…</div>;
  if (!history.length) return <div style={{ color: 'var(--text3)', fontSize: 13, padding: '1rem 0' }}>No history recorded.</div>;

  return (
    <div style={{ position: 'relative', paddingLeft: 20 }}>
      <div style={{ position: 'absolute', left: 6, top: 6, bottom: 6, width: 1, background: 'var(--border)' }} />
      {history.map((h, i) => (
        <div key={h.id} style={{ display: 'flex', gap: 12, marginBottom: 14, position: 'relative' }}>
          <div style={{
            width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
            background: 'var(--blue)', border: '2px solid var(--blue-bg)',
            position: 'absolute', left: -16, top: 3,
          }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 500 }}>
              {h.from_status
                ? <><StatusBadge status={h.from_status} /> → <StatusBadge status={h.to_status} /></>
                : <StatusBadge status={h.to_status} />}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 3 }}>
              {new Date(h.created_at).toLocaleString('en-ZA')} · {h.users?.name || 'System'}
              {h.note ? <> · <em>{h.note}</em></> : null}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

export default function ClaimModal({ claim, onClose }) {
  const [history, setHistory]   = useState([]);
  const [loadingH, setLoadingH] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    if (!claim) return;
    setTab('details');
    setLoadingH(true);
    api.getHistory(claim.ref)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setLoadingH(false));
  }, [claim?.ref]);

  if (!claim) return null;

  const nett = (claim.amount || 0) - (claim.advance ? claim.advC || 0 : 0);
  const engineLabel = TARIFFS[parseInt(claim.engineIdx)]?.engine || claim.engineIdx || '—';
  const allocEntries = Object.entries(claim.allocAmounts || {}).filter(([, v]) => parseFloat(v) > 0);

  const TABS = [
    { id: 'details',  label: 'Details' },
    { id: 'trips',    label: `Trips (${(claim.trips || []).length})` },
    { id: 'amounts',  label: 'Amounts' },
    { id: 'history',  label: `History (${history.length})` },
  ];

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 100, backdropFilter: 'blur(2px)',
      }} />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 620,
        background: 'var(--surface)', zIndex: 101,
        display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        overflowY: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 600 }}>{claim.ref}</span>
              <StatusBadge status={claim.status} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>
              {claim.name} · Persal {claim.persal} · {claim.dept}
            </div>
          </div>
          <Btn
            size="sm"
            variant="primary"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              await downloadPDF(claim, history).catch(() => {});
              setPdfLoading(false);
            }}
          >
            <i className="ti ti-file-type-pdf" style={{ fontSize: 14 }} />
            {pdfLoading ? 'Generating…' : 'Download PDF'}
          </Btn>
          <button onClick={onClose} style={{
            width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--surface2)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text2)',
          }}>
            <i className="ti ti-x" style={{ fontSize: 16 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: 0, borderBottom: '0.5px solid var(--border)',
          flexShrink: 0, padding: '0 1.5rem',
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: tab === t.id ? 'var(--blue-text)' : 'var(--text2)',
              borderBottom: tab === t.id ? '2px solid var(--blue)' : '2px solid transparent',
              fontWeight: tab === t.id ? 500 : 400, marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>

          {tab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Section title="Claimant">
                <Row2 a="Name" av={claim.name} b="Persal #" bv={claim.persal} />
                <Row2 a="Department" av={claim.dept} b="Contact" bv={claim.contact} />
                <Row2 a="Phone" av={claim.phone} b="Advance" bv={claim.advance ? `Yes — R ${(claim.advA||0).toFixed(2)} advance` : 'No'} />
              </Section>
              <Section title="Vehicle">
                <Row2 a="Type" av={claim.vehicleType === 'motor' ? 'Private motor vehicle' : 'Motorbike'} b="Engine" bv={engineLabel} />
                <Row2 a="Registration" av={claim.reg || '—'} b="KM bracket" bv={claim.kmBracket === 'more' ? '> 8 000 km/yr' : '≤ 8 000 km/yr'} />
              </Section>
              <Section title="Purpose">
                <div style={{ fontSize: 13, marginBottom: 6 }}>{claim.purpose || '—'}</div>
                <Row2 a="Log sheet ref" av={claim.logsheet || '—'} b="Signed by" bv={claim.sigName ? `${claim.sigName} (${claim.sigRank})` : '—'} />
              </Section>
              {claim.docs?.length > 0 && (
                <Section title="Supporting documents">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {claim.docs.map(d => (
                      <span key={d} style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 10,
                        background: 'var(--green-bg)', color: 'var(--green-text)',
                      }}>
                        <i className="ti ti-check" style={{ fontSize: 11, marginRight: 4 }} />{d}
                      </span>
                    ))}
                  </div>
                </Section>
              )}
              {claim.mandate && (
                <Section title="Persal mandate">
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{claim.mandate}</span>
                </Section>
              )}
            </div>
          )}

          {tab === 'trips' && (
            <div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: '1rem' }}>
                Total: <strong>{claim.km} km</strong>
              </div>
              <table>
                <thead>
                  <tr><th>#</th><th>Date from</th><th>Date to</th><th>From</th><th>To</th><th>KM</th></tr>
                </thead>
                <tbody>
                  {(claim.trips || []).map((t, i) => (
                    <tr key={t.id || i}>
                      <td style={{ color: 'var(--text3)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontSize: 12 }}>{t.dateFrom}</td>
                      <td style={{ fontSize: 12 }}>{t.dateTo}</td>
                      <td>{t.origin}</td>
                      <td>{t.dest}</td>
                      <td style={{ fontFamily: 'var(--mono)' }}>{t.km}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'amounts' && (
            <div>
              {allocEntries.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text2)', marginBottom: 8 }}>Persal allocation</div>
                  <table>
                    <thead><tr><th>Code</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead>
                    <tbody>
                      {allocEntries.map(([code, amt]) => {
                        const st = ST_CODES.find(s => s.code === code);
                        return (
                          <tr key={code}>
                            <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{code}</td>
                            <td style={{ fontSize: 12, color: 'var(--text2)' }}>{st?.desc || '—'}</td>
                            <td style={{ fontFamily: 'var(--mono)', textAlign: 'right' }}>R {parseFloat(amt).toFixed(2)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '1rem' }}>
                {[
                  { label: 'Total claim amount',        val: claim.amount || 0 },
                  { label: 'Less: advance outstanding', val: claim.advance ? claim.advC || 0 : 0 },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13, color: 'var(--text2)' }}>
                    <span>{r.label}</span>
                    <span style={{ fontFamily: 'var(--mono)' }}>R {r.val.toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', borderTop: '0.5px solid var(--border)', fontSize: 15, fontWeight: 600, marginTop: 4 }}>
                  <span>Nett amount payable</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--green-text)' }}>R {nett.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {tab === 'history' && <Timeline history={history} loading={loadingH} />}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 }}>{title}</div>
      <div style={{ background: 'var(--surface2)', borderRadius: 'var(--radius)', padding: '10px 12px' }}>{children}</div>
    </div>
  );
}

function Row2({ a, av, b, bv }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem', marginBottom: 6 }}>
      <div><span style={{ fontSize: 11, color: 'var(--text3)' }}>{a} </span><span style={{ fontSize: 13 }}>{av || '—'}</span></div>
      <div><span style={{ fontSize: 11, color: 'var(--text3)' }}>{b} </span><span style={{ fontSize: 13 }}>{bv || '—'}</span></div>
    </div>
  );
}
