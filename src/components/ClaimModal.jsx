import React, { useState, useEffect } from 'react';
import { StatusBadge, Btn } from './Shared';
import { STATUS_META, TARIFFS, ST_CODES, VEHICLE_CATEGORIES } from '../data/constants';
import { api, attachmentUrl } from '../utils/api';

// ── helpers ──────────────────────────────────────────────────────────────────

const BLUE      = [24, 95, 165];
const BLUE_LIGHT = [230, 241, 251];
const WHITE     = [255, 255, 255];
const BLACK     = [0, 0, 0];
const GRAY      = [120, 120, 120];

function pdfHeader(doc, claim) {
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, 210, 24, 'F');
  doc.setTextColor(...WHITE);
  doc.setFontSize(13); doc.setFont(undefined, 'bold');
  doc.text('GAUTENG PROVINCIAL GOVERNMENT', 105, 8, { align: 'center' });
  doc.setFontSize(9.5); doc.setFont(undefined, 'normal');
  doc.text('TRAVEL & SUBSISTENCE CLAIM  —  Z 584', 105, 14.5, { align: 'center' });
  doc.setFontSize(7.5);
  doc.text(`Ref: ${claim.ref}   ·   Status: ${STATUS_META[claim.status]?.label || claim.status}   ·   Submitted: ${(claim.createdAt || '').slice(0, 10)}`, 105, 21, { align: 'center' });
  doc.setTextColor(...BLACK);
}

function sectionLabel(doc, y, text) {
  doc.setFillColor(...BLUE_LIGHT);
  doc.rect(14, y - 4, 182, 5.5, 'F');
  doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
  doc.setTextColor(...BLUE);
  doc.text(text, 16, y);
  doc.setTextColor(...BLACK); doc.setFont(undefined, 'normal');
  return y + 3;
}

function signBlock(doc, x, y, w, role) {
  doc.setFillColor(248, 250, 252);
  doc.rect(x, y, w, 28, 'F');
  doc.setDrawColor(200, 210, 220); doc.rect(x, y, w, 28, 'S');
  doc.setFontSize(7.5); doc.setFont(undefined, 'bold');
  doc.setTextColor(...BLUE); doc.text(role, x + 2, y + 5);
  doc.setTextColor(100); doc.setFont(undefined, 'normal'); doc.setFontSize(7);
  doc.text('Signature:', x + 2, y + 13);
  doc.setDrawColor(160); doc.line(x + 20, y + 13, x + w - 3, y + 13);
  doc.text('Name:', x + 2, y + 19);
  doc.line(x + 14, y + 19, x + w - 3, y + 19);
  doc.text('Date:', x + 2, y + 25);
  doc.line(x + 14, y + 25, x + w - 3, y + 25);
  doc.setTextColor(...BLACK);
}

// ── PDF export (Z 584 — Sheet 1 + Sheet 2) ──────────────────────────────────

async function downloadPDF(claim, history) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const th  = { fillColor: BLUE_LIGHT, textColor: BLUE, fontStyle: 'bold', fontSize: 7.5 };
  const tbl = { theme: 'grid', styles: { fontSize: 8, cellPadding: 2.5 }, headStyles: th };

  // ── PAGE 1 — Sheet 1 ─────────────────────────────────────────────────────
  pdfHeader(doc, claim);

  // A. Employee details
  sectionLabel(doc, 31, 'A — CLAIMANT / EMPLOYEE DETAILS');
  autoTable(doc, {
    ...tbl,
    startY: 34,
    body: [
      ['Surname & Initials', claim.name || '—', 'Persal Number', claim.persal || '—'],
      ['Business Unit / Dept', claim.dept || '—', 'Phone / Contact', claim.phone || claim.contact || '—'],
      ['Post level / Rank', claim.sigRank || '—', 'Period of travel', (() => {
        const dates = (claim.trips || []).map(t => t.dateFrom).filter(Boolean).sort();
        return dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : '—';
      })()],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44, fillColor: [245, 248, 252] }, 2: { fontStyle: 'bold', cellWidth: 44, fillColor: [245, 248, 252] } },
  });

  // B. Advance
  const advA = claim.advance ? (claim.advA || 0) : 0;
  const advB = claim.advance ? (claim.advB || 0) : 0;
  const advC = claim.advance ? (claim.advC || 0) : 0;
  let y = doc.lastAutoTable.finalY + 5;
  sectionLabel(doc, y, 'B — ADVANCE (Regulation R.195)');
  autoTable(doc, {
    ...tbl,
    startY: y + 3,
    body: [
      ['A. Total advance drawn', `R ${advA.toFixed(2)}`, 'B. Amount repaid to cashier', `R ${advB.toFixed(2)}`],
      [{ content: 'C. Balance outstanding (A − B)', colSpan: 1 }, { content: `R ${advC.toFixed(2)}`, colSpan: 1 }, { content: 'Advance taken?', colSpan: 1 }, { content: claim.advance ? 'Yes' : 'No', colSpan: 1 }],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 70, fillColor: [245, 248, 252] }, 2: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 248, 252] } },
  });

  // C. Persal allocation — all ST codes
  y = doc.lastAutoTable.finalY + 5;
  sectionLabel(doc, y, 'C — PERSAL ALLOCATION — Function 5.3.11');
  const allocBody = ST_CODES.map(s => {
    const amt = parseFloat((claim.allocAmounts || {})[s.code] || 0);
    return [s.code, s.desc, s.sars, amt > 0 ? `R ${amt.toFixed(2)}` : ''];
  });
  const allocTotal = Object.values(claim.allocAmounts || {}).reduce((a, v) => a + parseFloat(v || 0), 0);
  autoTable(doc, {
    ...tbl,
    startY: y + 3,
    head: [['Persal code', 'Description', 'SARS code', 'Amount (R)']],
    body: [
      ...allocBody,
      [{ content: 'TOTAL CLAIM AMOUNT', colSpan: 3, styles: { fontStyle: 'bold', fillColor: BLUE_LIGHT } },
       { content: `R ${allocTotal > 0 ? allocTotal.toFixed(2) : (claim.amount || 0).toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: BLUE_LIGHT } }],
    ],
    columnStyles: {
      0: { cellWidth: 26, fontFamily: 'courier', fontSize: 7.5 },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 32, halign: 'right' },
    },
  });

  // Financial summary — nett payable
  const nett = (claim.amount || 0) - advC;
  y = doc.lastAutoTable.finalY + 5;
  autoTable(doc, {
    ...tbl,
    startY: y,
    body: [
      ['Total claim amount', `R ${(claim.amount || 0).toFixed(2)}`, 'Less: advance outstanding (C)', `R ${advC.toFixed(2)}`],
      [{ content: 'NETT AMOUNT PAYABLE', styles: { fontStyle: 'bold', fillColor: BLUE_LIGHT } }, { content: `R ${nett.toFixed(2)}`, styles: { fontStyle: 'bold', halign: 'right', fillColor: BLUE_LIGHT } }, { content: 'Persal mandate', styles: { fillColor: [245, 248, 252] } }, { content: claim.mandate || '—', styles: { fillColor: [245, 248, 252] } }],
    ],
    columnStyles: { 0: { cellWidth: 70, fontStyle: 'bold', fillColor: [245, 248, 252] }, 2: { cellWidth: 50, fontStyle: 'bold', fillColor: [245, 248, 252] } },
  });

  // D. Certification / sign-off
  y = doc.lastAutoTable.finalY + 6;
  if (y > 230) { doc.addPage(); pdfHeader(doc, claim); y = 30; }
  sectionLabel(doc, y, 'D — CERTIFICATION AND AUTHORISATION');
  y += 4;
  doc.setFontSize(7.5); doc.setFont(undefined, 'italic'); doc.setTextColor(80);
  doc.text('I certify that I was actually and necessarily employed travelling on public service during the period stated above, and that the charges are correct and in accordance with the authorised tariff.', 14, y, { maxWidth: 182 });
  doc.setFont(undefined, 'normal'); doc.setTextColor(...BLACK);
  y += 8;
  const bw = 57;
  signBlock(doc, 14,        y, bw, 'OFFICIAL (Claimant)');
  signBlock(doc, 14 + bw + 4, y, bw, 'SUPERVISOR / APPROVING OFFICER');
  signBlock(doc, 14 + 2*(bw+4), y, bw, 'HRS / FINANCE AUTHORISATION');

  // ── PAGE 2 — Sheet 2 ─────────────────────────────────────────────────────
  doc.addPage();
  pdfHeader(doc, claim);

  // E. Vehicle details
  sectionLabel(doc, 31, 'E — VEHICLE DETAILS');
  const isNewV = !!claim.vehicleCategory;
  const vehicleBody = isNewV ? [
    ['Vehicle Category', VEHICLE_CATEGORIES.find(c => c.value === claim.vehicleCategory)?.label || claim.vehicleCategory, 'Registration No.', claim.reg || '—'],
    ['Fuel Type', claim.fuelType || '—', 'Engine / Weight Band', claim.engineBand || claim.weightBand || '—'],
    ['Tariff Rate (R/km)', `R ${parseFloat(claim.tariffRate || 0).toFixed(4)}`, 'DoT Circular Ref', claim.persalRef || '—'],
    ['Reimbursement Scheme', claim.reimbursementScheme || '—', 'Late Submission', claim.isLateSubmission ? '⚠ Yes — letter attached' : 'No'],
  ] : [
    ['Vehicle Type', claim.vehicleType === 'motor' ? 'Private Motor Vehicle' : 'Motorbike', 'Registration No.', claim.reg || '—'],
    ['Engine Capacity', TARIFFS[parseInt(claim.engineIdx)]?.engine || '—', 'Annual KM Bracket', claim.kmBracket === 'more' ? '> 8 000 km/yr (R.469)' : '≤ 8 000 km/yr (R.470)'],
  ];
  autoTable(doc, {
    ...tbl,
    startY: 34,
    body: vehicleBody,
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44, fillColor: [245, 248, 252] }, 2: { fontStyle: 'bold', cellWidth: 44, fillColor: [245, 248, 252] } },
  });

  // F. Purpose & trip log
  y = doc.lastAutoTable.finalY + 5;
  sectionLabel(doc, y, `F — TRIP LOG   (Purpose: ${claim.purpose || '—'})`);
  const rate = parseFloat(claim.tariffRate || 0);
  const tripRows = (claim.trips || []).map((t, i) => {
    const km  = parseFloat(t.km || 0);
    const amt = rate > 0 ? (rate * km) : 0;
    return [
      i + 1,
      t.dateFrom || '—',
      t.dateTo   || '—',
      t.origin   || '—',
      t.dest     || '—',
      t.reason   || claim.purpose || '—',
      rate > 0 ? `R ${rate.toFixed(4)}` : '—',
      `${km}`,
      amt > 0 ? `R ${amt.toFixed(2)}` : '—',
    ];
  });
  const totalKm  = (claim.trips || []).reduce((s, t) => s + parseFloat(t.km || 0), 0);
  const totalAmt = claim.amount || (rate > 0 ? rate * totalKm : 0);
  autoTable(doc, {
    ...tbl,
    startY: y + 3,
    head: [['#', 'Date\nFrom', 'Date\nTo', 'Departure', 'Destination', 'Reason / Purpose', 'Tariff\n(R/km)', 'KM', 'Amount\n(R)']],
    body: [
      ...tripRows,
      [
        { content: 'TOTALS', colSpan: 7, styles: { fontStyle: 'bold', fillColor: BLUE_LIGHT, halign: 'right' } },
        { content: `${totalKm}`, styles: { fontStyle: 'bold', fillColor: BLUE_LIGHT } },
        { content: `R ${totalAmt.toFixed(2)}`, styles: { fontStyle: 'bold', fillColor: BLUE_LIGHT } },
      ],
    ],
    columnStyles: {
      0: { cellWidth: 7,  halign: 'center' },
      1: { cellWidth: 18 },
      2: { cellWidth: 18 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 45 },
      6: { cellWidth: 18, halign: 'right' },
      7: { cellWidth: 12, halign: 'right' },
      8: { cellWidth: 22, halign: 'right' },
    },
  });

  // G. Approved memo / supporting docs
  y = doc.lastAutoTable.finalY + 5;
  autoTable(doc, {
    ...tbl,
    startY: y,
    body: [
      ['Approved memo ref', claim.logsheet || '—', 'Duplicate exception', claim.duplicateException ? `Yes — ${claim.duplicateExceptionNote || ''}` : 'No'],
      ['Attachments', (claim.attachments || []).map(a => a.fileName).join(', ') || 'None', 'System ref', claim.ref],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44, fillColor: [245, 248, 252] }, 2: { fontStyle: 'bold', cellWidth: 44, fillColor: [245, 248, 252] } },
  });

  // H. Status history
  if (history.length > 0) {
    y = doc.lastAutoTable.finalY + 5;
    if (y > 240) { doc.addPage(); pdfHeader(doc, claim); y = 30; }
    sectionLabel(doc, y, 'H — WORKFLOW HISTORY');
    autoTable(doc, {
      ...tbl,
      startY: y + 3,
      head: [['Date / Time', 'Transition', 'Actor', 'Note']],
      body: history.map(h => [
        new Date(h.created_at).toLocaleString('en-ZA'),
        `${STATUS_META[h.from_status]?.label || '—'} → ${STATUS_META[h.to_status]?.label || h.to_status}`,
        h.users?.name || '—',
        h.note || '—',
      ]),
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: th,
    });
  }

  // Footer every page
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(6.5); doc.setTextColor(...GRAY);
    doc.text(`GPG Persal T&S Claims  ·  ${claim.ref}  ·  ${i === 1 ? 'Sheet 1 — Allocation & Certification' : i === 2 ? 'Sheet 2 — Vehicle & Trip Log' : `Sheet ${i}`}  ·  Page ${i} of ${pages}`, 105, 293, { align: 'center' });
  }

  doc.save(`${claim.ref}.pdf`);
}

// ── Excel export ─────────────────────────────────────────────────────────────

async function downloadExcel(claim) {
  const XLSX = await import('xlsx');

  // Sheet 1 — Claim summary
  const isNewV = !!claim.vehicleCategory;
  const totalKm = (claim.trips || []).reduce((s, t) => s + parseFloat(t.km || 0), 0);
  const rate    = parseFloat(claim.tariffRate || 0);
  const totalAmt = claim.amount || (rate > 0 ? rate * totalKm : 0);
  const advC    = claim.advance ? (claim.advC || 0) : 0;

  const summaryRows = [
    ['GAUTENG PROVINCIAL GOVERNMENT — TRAVEL & SUBSISTENCE CLAIM (Z 584)'],
    [],
    ['Claim Reference', claim.ref],
    ['Status',          STATUS_META[claim.status]?.label || claim.status],
    ['Submitted',       (claim.createdAt || '').slice(0, 10)],
    [],
    ['CLAIMANT DETAILS'],
    ['Surname & Initials', claim.name],
    ['Persal Number',      claim.persal],
    ['Business Unit',      claim.dept],
    ['Phone / Contact',    claim.phone || claim.contact],
    ['Rank / Post level',  claim.sigRank],
    [],
    ['VEHICLE DETAILS'],
    isNewV
      ? ['Vehicle Category', VEHICLE_CATEGORIES.find(c => c.value === claim.vehicleCategory)?.label || claim.vehicleCategory]
      : ['Vehicle Type', claim.vehicleType === 'motor' ? 'Private Motor Vehicle' : 'Motorbike'],
    isNewV
      ? ['Fuel Type', claim.fuelType]
      : ['Engine Capacity', TARIFFS[parseInt(claim.engineIdx)]?.engine || '—'],
    isNewV
      ? ['Tariff Rate (R/km)', parseFloat(claim.tariffRate || 0)]
      : ['Annual KM Bracket', claim.kmBracket === 'more' ? '> 8 000 km/yr' : '≤ 8 000 km/yr'],
    isNewV ? ['DoT Circular Ref', claim.persalRef]   : ['Registration', claim.reg],
    isNewV ? ['Reimbursement Scheme', claim.reimbursementScheme] : [],
    ['Registration', claim.reg],
    [],
    ['FINANCIAL SUMMARY'],
    ['Total Claim Amount',        totalAmt],
    ['Less: Advance Outstanding', advC],
    ['NETT AMOUNT PAYABLE',       totalAmt - advC],
    [],
    ['PERSAL ALLOCATION (Function 5.3.11)'],
    ['Persal Code', 'Description', 'SARS Code', 'Amount (R)'],
    ...ST_CODES.map(s => [s.code, s.desc, s.sars, parseFloat((claim.allocAmounts || {})[s.code] || 0)]),
    [],
    ['Approved Memo Ref', claim.logsheet],
    ['Purpose', claim.purpose],
    ['Late Submission', claim.isLateSubmission ? 'Yes' : 'No'],
    ['Duplicate Exception', claim.duplicateException ? 'Yes' : 'No'],
    claim.duplicateException ? ['Exception Note', claim.duplicateExceptionNote] : [],
  ].filter(r => r.length > 0);

  // Sheet 2 — Trip log
  const tripHeader = ['#', 'Date From', 'Date To', 'Departure', 'Destination', 'Reason / Purpose', 'Tariff (R/km)', 'KM', 'Amount (R)'];
  const tripRows = (claim.trips || []).map((t, i) => {
    const km  = parseFloat(t.km || 0);
    const amt = rate > 0 ? rate * km : 0;
    return [i + 1, t.dateFrom, t.dateTo, t.origin, t.dest, t.reason || claim.purpose, rate || '', km, amt || ''];
  });
  const tripData = [tripHeader, ...tripRows, ['', '', '', '', '', '', 'TOTAL', totalKm, totalAmt]];

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(summaryRows);
  const ws2 = XLSX.utils.aoa_to_sheet(tripData);

  // Column widths for trip sheet
  ws2['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 12 }, { wch: 22 }, { wch: 22 }, { wch: 36 }, { wch: 14 }, { wch: 8 }, { wch: 14 }];
  ws1['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 14 }, { wch: 14 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Claim Summary');
  XLSX.utils.book_append_sheet(wb, ws2, 'Trip Log');
  XLSX.writeFile(wb, `${claim.ref}.xlsx`);
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
            </div>
            {(h.info_message || h.note) && (
              <div style={{
                marginTop: 5, padding: '6px 10px',
                background: (h.to_status === 'info_requested') ? 'var(--purple-bg)' : 'var(--surface2)',
                border: `0.5px solid ${h.to_status === 'info_requested' ? 'var(--purple-text)' : 'var(--border)'}`,
                borderRadius: 'var(--radius)',
                fontSize: 12,
                color: h.to_status === 'info_requested' ? 'var(--purple-text)' : 'var(--text2)',
              }}>
                {h.info_message || h.note}
              </div>
            )}
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
  const [pdfLoading,  setPdfLoading]  = useState(false);
  const [xlsxLoading, setXlsxLoading] = useState(false);
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
  // Support both old (engineIdx) and new (vehicleCategory) claims
  const engineLabel = claim.vehicleCategory
    ? VEHICLE_CATEGORIES.find(c => c.value === claim.vehicleCategory)?.label || claim.vehicleCategory
    : (TARIFFS[parseInt(claim.engineIdx)]?.engine || claim.engineIdx || '—');
  const allocEntries = Object.entries(claim.allocAmounts || {}).filter(([, v]) => parseFloat(v) > 0);
  const hasAttachments = (claim.attachments || []).length > 0;

  const TABS = [
    { id: 'details',  label: 'Details' },
    { id: 'trips',    label: `Trips (${(claim.trips || []).length})` },
    { id: 'amounts',  label: 'Amounts' },
    ...(hasAttachments ? [{ id: 'files', label: `Files (${claim.attachments.length})` }] : []),
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
            {pdfLoading ? 'Generating…' : 'PDF'}
          </Btn>
          <Btn
            size="sm"
            disabled={xlsxLoading}
            onClick={async () => {
              setXlsxLoading(true);
              await downloadExcel(claim).catch(() => {});
              setXlsxLoading(false);
            }}
          >
            <i className="ti ti-file-type-xls" style={{ fontSize: 14 }} />
            {xlsxLoading ? 'Exporting…' : 'Excel'}
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
                {claim.vehicleCategory ? (
                  <>
                    <Row2 a="Category" av={engineLabel} b="Registration" bv={claim.reg || '—'} />
                    <Row2 a="Fuel type" av={claim.fuelType || '—'} b="Engine band" bv={claim.engineBand || claim.weightBand || '—'} />
                    <Row2 a="Tariff rate" av={claim.tariffRate > 0 ? `R ${parseFloat(claim.tariffRate).toFixed(4)}/km` : '—'} b="Circular / Persal ref" bv={claim.persalRef || '—'} />
                    <Row2 a="Scheme" av={claim.reimbursementScheme || '—'} b="KM" bv={`${claim.km} km`} />
                  </>
                ) : (
                  <>
                    <Row2 a="Type" av={claim.vehicleType === 'motor' ? 'Private motor vehicle' : 'Motorbike'} b="Engine" bv={engineLabel} />
                    <Row2 a="Registration" av={claim.reg || '—'} b="KM bracket" bv={claim.kmBracket === 'more' ? '> 8 000 km/yr' : '≤ 8 000 km/yr'} />
                  </>
                )}
                {claim.isLateSubmission && (
                  <div style={{ marginTop: 6, padding: '5px 8px', background: 'var(--amber-bg)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--amber-text)' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: 13, marginRight: 6 }} />Late submission
                  </div>
                )}
                {claim.duplicateException && (
                  <div style={{ marginTop: 6, padding: '5px 8px', background: 'var(--purple-bg)', borderRadius: 'var(--radius)', fontSize: 12, color: 'var(--purple-text)' }}>
                    <i className="ti ti-shield-exclamation" style={{ fontSize: 13, marginRight: 6 }} />
                    Duplicate exception: {claim.duplicateExceptionNote || '—'}
                  </div>
                )}
              </Section>
              <Section title="Purpose">
                <div style={{ fontSize: 13, marginBottom: 6 }}>{claim.purpose || '—'}</div>
                <Row2 a="Approved memo ref" av={claim.logsheet || '—'} b="Signed by" bv={claim.sigName ? `${claim.sigName} (${claim.sigRank})` : '—'} />
              </Section>
              {(claim.docs?.length > 0 || claim.docLinks?.length > 0) && (
                <Section title="Supporting documents">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: claim.docLinks?.length > 0 ? 8 : 0 }}>
                    {(claim.docs || []).map(d => (
                      <span key={d} style={{
                        fontSize: 12, padding: '3px 10px', borderRadius: 10,
                        background: 'var(--green-bg)', color: 'var(--green-text)',
                      }}>
                        <i className="ti ti-check" style={{ fontSize: 11, marginRight: 4 }} />{d}
                      </span>
                    ))}
                  </div>
                  {(claim.docLinks || []).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {claim.docLinks.map((dl, i) => (
                        <a key={i} href={dl.url} target="_blank" rel="noopener noreferrer" style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontSize: 13, color: 'var(--blue-text)', textDecoration: 'none',
                          padding: '5px 10px', background: 'var(--blue-bg)',
                          borderRadius: 'var(--radius)',
                        }}>
                          <i className="ti ti-download" style={{ fontSize: 14 }} />
                          {dl.name || 'Document'} <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 4 }}>↗</span>
                        </a>
                      ))}
                    </div>
                  )}
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

          {tab === 'files' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(claim.attachments || []).map(a => (
                <a
                  key={a.id}
                  href={attachmentUrl(claim.ref, a.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: 'var(--blue-bg)',
                    borderRadius: 'var(--radius)', textDecoration: 'none',
                    color: 'var(--blue-text)',
                  }}
                >
                  <i className="ti ti-file-download" style={{ fontSize: 18, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{a.fileName}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                      {a.fieldKey} · {a.fileSize > 0 ? `${(a.fileSize / 1024).toFixed(0)} KB` : ''} · {(a.mimeType || '').split('/')[1] || ''}
                    </div>
                  </div>
                  <i className="ti ti-external-link" style={{ fontSize: 14, opacity: 0.6 }} />
                </a>
              ))}
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
