import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardTitle, Btn, StatusBadge } from './Shared';
import { STATUS_META } from '../data/constants';

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  blue: '#185FA5', green: '#3B6D11', amber: '#854F0B',
  red: '#A32D2D', teal: '#0F6E56', purple: '#534AB7', gray: '#5F5E5A',
};
const PIE_PALETTE = [C.blue, C.teal, C.green, C.amber, C.purple, C.red, C.gray];
const STATUS_COLOR = {
  draft: C.gray, pending: C.amber, approved: C.green,
  rejected: C.red, ecm: C.purple, routed: C.purple, paid: C.teal,
};
const ttStyle = { background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 };

// ── SA Financial Year helpers (Apr–Mar) ───────────────────────────────────────
function getFY(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const yr = d.getFullYear(), mo = d.getMonth();
  return mo >= 3 ? `${yr}/${yr + 1}` : `${yr - 1}/${yr}`;
}

function fyRange(fy) {
  const [a, b] = fy.split('/').map(Number);
  return { start: `${a}-04-01`, end: `${b}-03-31` };
}

const FY_MONTHS = [
  { label: 'April', idx: 3 }, { label: 'May', idx: 4 }, { label: 'June', idx: 5 },
  { label: 'July', idx: 6 }, { label: 'August', idx: 7 }, { label: 'September', idx: 8 },
  { label: 'October', idx: 9 }, { label: 'November', idx: 10 }, { label: 'December', idx: 11 },
  { label: 'January', idx: 0 }, { label: 'February', idx: 1 }, { label: 'March', idx: 2 },
];

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(rows) {
  const cols = ['Ref', 'Official', 'Persal', 'Dept', 'Purpose', 'Date From', 'Date To', 'KM', 'Amount', 'Status', 'Mandate'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = [cols.join(','), ...rows.map(c => [
    esc(c.ref), esc(c.name), esc(c.persal), esc(c.dept),
    esc(c.purpose), esc(c.dateFrom), esc(c.dateTo),
    esc(c.km), esc(c.amount?.toFixed(2)), esc(c.status), esc(c.mandate || ''),
  ].join(','))];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gpg-travel-claims-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── PDF export ────────────────────────────────────────────────────────────────
async function exportPDF(rows, filters, summary) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date().toLocaleDateString('en-ZA');

  // Header bar
  doc.setFillColor(24, 95, 165);
  doc.rect(0, 0, W, 18, 'F');
  doc.setFontSize(11); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('GAUTENG PROVINCIAL GOVERNMENT', 14, 7);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Persal Travel & Subsistence Claims — Report', 14, 13);
  doc.setFontSize(9); doc.setTextColor(200, 220, 255);
  doc.text(`Generated: ${now}`, W - 14, 13, { align: 'right' });

  // Filter summary
  const filterStr = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('  |  ') || 'No filters applied';
  doc.setFontSize(8); doc.setTextColor(80, 80, 80); doc.setFont('helvetica', 'italic');
  doc.text(filterStr, 14, 25);

  // Summary metrics
  doc.setFont('helvetica', 'bold'); doc.setTextColor(24, 95, 165); doc.setFontSize(9);
  doc.text(`Total claims: ${summary.count}`, 14, 32);
  doc.text(`Total amount: R ${summary.total.toFixed(2)}`, 70, 32);
  doc.text(`Paid: ${summary.paid}`, 140, 32);
  doc.text(`In pipeline: ${summary.pipeline}`, 190, 32);

  autoTable(doc, {
    startY: 36,
    head: [['Ref', 'Official', 'Persal', 'Department', 'Purpose', 'Date From', 'Date To', 'KM', 'Amount (R)', 'Status']],
    body: rows.map(c => [
      c.ref, c.name, c.persal,
      (c.dept || '').replace('GPG — ', ''),
      c.purpose, c.dateFrom, c.dateTo, c.km,
      (c.amount || 0).toFixed(2),
      STATUS_META[c.status]?.label || c.status,
    ]),
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [24, 95, 165], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles: { 0: { font: 'courier', fontSize: 7 }, 8: { halign: 'right' } },
    didDrawPage: (data) => {
      const n = doc.internal.getCurrentPageInfo().pageNumber;
      const total = doc.internal.getNumberOfPages();
      doc.setFontSize(7); doc.setTextColor(150);
      doc.text(`Page ${n} of ${total}`, W / 2, doc.internal.pageSize.getHeight() - 8, { align: 'center' });
    },
  });

  doc.save(`gpg-travel-claims-${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ── Metric strip ──────────────────────────────────────────────────────────────
function MetricStrip({ count, total, paid, pipeline }) {
  const items = [
    { label: 'Total claims', value: count, color: C.blue },
    { label: 'Total amount', value: `R ${total.toFixed(0)}`, color: C.teal },
    { label: 'Paid', value: paid, color: C.green },
    { label: 'In pipeline', value: pipeline, color: C.amber },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
      {items.map(m => (
        <div key={m.label} style={{
          background: `linear-gradient(135deg, ${m.color}12 0%, #ffffff 100%)`,
          border: `0.5px solid ${m.color}28`, borderRadius: 'var(--radius-lg)', padding: '1rem',
        }}>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6 }}>{m.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: m.color }}>{m.value}</div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Reports({ claims, toast }) {
  const allFYs = useMemo(() => {
    const fys = [...new Set(claims.map(c => getFY(c.dateFrom || c.createdAt)).filter(Boolean))].sort().reverse();
    if (fys.length === 0) {
      const now = new Date();
      const cur = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      fys.push(`${cur}/${cur + 1}`);
    }
    return fys;
  }, [claims]);

  const allDepts = useMemo(() => [...new Set(claims.map(c => c.dept).filter(Boolean))].sort(), [claims]);
  const allVehicles = useMemo(() => [...new Set(claims.map(c => c.vehicleType).filter(Boolean))].sort(), [claims]);

  const [fy,          setFy]          = useState(allFYs[0] || '');
  const [month,       setMonth]       = useState('');
  const [dept,        setDept]        = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [kmBracket,   setKmBracket]   = useState('');
  const [status,      setStatus]      = useState('');

  const filtered = useMemo(() => {
    const { start, end } = fy ? fyRange(fy) : {};
    return claims.filter(c => {
      const d = c.dateFrom || c.createdAt || '';
      if (fy && (d < start || d > end)) return false;
      if (month !== '') {
        const mo = new Date(d).getMonth();
        if (mo !== parseInt(month)) return false;
      }
      if (dept && c.dept !== dept) return false;
      if (vehicleType && c.vehicleType !== vehicleType) return false;
      if (kmBracket && c.kmBracket !== kmBracket) return false;
      if (status && c.status !== status) return false;
      return true;
    });
  }, [claims, fy, month, dept, vehicleType, kmBracket, status]);

  const summary = useMemo(() => ({
    count:    filtered.length,
    total:    filtered.reduce((s, c) => s + (c.amount || 0), 0),
    paid:     filtered.filter(c => c.status === 'paid').length,
    pipeline: filtered.filter(c => !['paid', 'rejected', 'draft'].includes(c.status)).length,
  }), [filtered]);

  // Monthly bar data (within selected FY)
  const monthlyData = useMemo(() => {
    if (!fy) return [];
    const [fyStart] = fy.split('/').map(Number);
    return FY_MONTHS.map(m => {
      const yr = m.idx >= 3 ? fyStart : fyStart + 1;
      const key = `${yr}-${String(m.idx + 1).padStart(2, '0')}`;
      const mc = filtered.filter(c => (c.dateFrom || c.createdAt || '').startsWith(key));
      return {
        month: m.label.slice(0, 3),
        count: mc.length,
        amount: mc.reduce((s, c) => s + (c.amount || 0), 0),
      };
    });
  }, [filtered, fy]);

  // Status pie
  const statusData = useMemo(() => {
    const counts = {};
    filtered.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return Object.entries(counts).map(([st, value]) => ({
      name: STATUS_META[st]?.label || st, value, status: st,
    }));
  }, [filtered]);

  // Dept bar
  const deptData = useMemo(() => {
    const acc = {};
    filtered.forEach(c => {
      const d = (c.dept || 'Unknown').replace('GPG — ', '');
      if (!acc[d]) acc[d] = { dept: d, count: 0, amount: 0 };
      acc[d].count++;
      acc[d].amount += c.amount || 0;
    });
    return Object.values(acc).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  function clearFilters() {
    setFy(allFYs[0] || ''); setMonth(''); setDept(''); setVehicleType(''); setKmBracket(''); setStatus('');
  }

  const activeFilters = { 'FY': fy, 'Month': FY_MONTHS.find(m => String(m.idx) === month)?.label || '', 'Dept': (dept || '').replace('GPG — ', ''), 'Vehicle': vehicleType, 'KM bracket': kmBracket, 'Status': status ? STATUS_META[status]?.label : '' };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 500 }}>Reports</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            {fy ? `SA Financial Year ${fy} (Apr–Mar)` : 'All periods'} — {filtered.length} claims
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => exportCSV(filtered)}>
            <i className="ti ti-download" style={{ fontSize: 15 }} /> Export CSV
          </Btn>
          <Btn onClick={() => exportPDF(filtered, activeFilters, summary).catch(e => toast('PDF error: ' + e.message))}>
            <i className="ti ti-file-type-pdf" style={{ fontSize: 15 }} /> Export PDF
          </Btn>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8, padding: '10px 14px',
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem',
      }}>
        <select value={fy} onChange={e => setFy(e.target.value)} style={{ width: 140 }}>
          <option value="">All years</option>
          {allFYs.map(f => <option key={f} value={f}>FY {f}</option>)}
        </select>

        <select value={month} onChange={e => setMonth(e.target.value)} style={{ width: 130 }}>
          <option value="">All months</option>
          {FY_MONTHS.map(m => <option key={m.idx} value={m.idx}>{m.label}</option>)}
        </select>

        <select value={dept} onChange={e => setDept(e.target.value)} style={{ width: 170 }}>
          <option value="">All departments</option>
          {allDepts.map(d => <option key={d} value={d}>{d.replace('GPG — ', '')}</option>)}
        </select>

        <select value={vehicleType} onChange={e => setVehicleType(e.target.value)} style={{ width: 140 }}>
          <option value="">All vehicle types</option>
          {allVehicles.map(v => <option key={v} value={v} style={{ textTransform: 'capitalize' }}>{v}</option>)}
          {allVehicles.length === 0 && <><option value="private">Private</option><option value="govt">Government</option></>}
        </select>

        <select value={kmBracket} onChange={e => setKmBracket(e.target.value)} style={{ width: 150 }}>
          <option value="">All KM brackets</option>
          <option value="less">&lt; 14,500 km (0469)</option>
          <option value="more">14,501+ km (0470)</option>
        </select>

        <select value={status} onChange={e => setStatus(e.target.value)} style={{ width: 150 }}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>

        {(fy !== allFYs[0] || month || dept || vehicleType || kmBracket || status) && (
          <button onClick={clearFilters} style={{
            padding: '5px 10px', borderRadius: 'var(--radius)', border: '0.5px solid var(--border2)',
            background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, cursor: 'pointer',
          }}>
            <i className="ti ti-x" style={{ fontSize: 13, marginRight: 4 }} />Clear
          </button>
        )}
      </div>

      <MetricStrip {...summary} />

      {/* Charts row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <Card>
          <CardTitle>Monthly claim count &amp; amount — {fy}</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickFormatter={v => `R${v}`} />
              <Tooltip contentStyle={ttStyle} formatter={(v, n) => n === 'amount' ? [`R ${v.toFixed(0)}`, 'Amount'] : [v, 'Claims']} />
              <Bar yAxisId="left" dataKey="count" fill={C.blue} radius={[4,4,0,0]} name="Claims" />
              <Line yAxisId="right" type="monotone" dataKey="amount" stroke={C.teal} strokeWidth={2} dot={{ r: 3 }} name="Amount" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>Claims by status</CardTitle>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="45%" outerRadius={65} dataKey="value"
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                {statusData.map((d, i) => <Cell key={i} fill={STATUS_COLOR[d.status] || PIE_PALETTE[i % PIE_PALETTE.length]} />)}
              </Pie>
              <Tooltip contentStyle={ttStyle} />
              <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Dept chart */}
      {deptData.length > 1 && (
        <div style={{ marginBottom: '1rem' }}>
          <Card>
            <CardTitle>Claims by department</CardTitle>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={deptData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="dept" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} formatter={(v, n) => n === 'amount' ? [`R ${v.toFixed(0)}`, 'Amount'] : [v, 'Count']} />
                <Bar dataKey="count" fill={C.blue} radius={[4,4,0,0]} name="Count" />
                <Bar dataKey="amount" fill={C.teal} radius={[4,4,0,0]} name="Amount (R)" />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Claims register */}
      <Card noPad>
        <div style={{ padding: '12px 16px 10px', borderBottom: '0.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Claims register ({filtered.length})</div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Official</th><th>Persal</th><th>Department</th>
              <th>Purpose</th><th>KM</th><th>Amount</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                  No claims match the selected filters
                </td>
              </tr>
            ) : filtered.map(c => (
              <tr key={c.ref}>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                <td>{c.name}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.persal}</td>
                <td style={{ fontSize: 12, color: 'var(--text2)' }}>{(c.dept || '').replace('GPG — ', '')}</td>
                <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</td>
                <td>{c.km} km</td>
                <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                <td><StatusBadge status={c.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
