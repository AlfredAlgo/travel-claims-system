import React from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { Card, CardTitle, StatusBadge } from './Shared';
import { STATUS_META } from '../data/constants';

// ── Color palette (hardcoded — recharts can't read CSS vars) ─────────────────
const C = {
  blue:   '#185FA5',
  green:  '#3B6D11',
  amber:  '#854F0B',
  red:    '#A32D2D',
  teal:   '#0F6E56',
  purple: '#534AB7',
  gray:   '#5F5E5A',
};
const STATUS_COLOR = {
  draft: C.gray, pending: C.amber, approved: C.green,
  compiled: C.blue, verified: C.teal, hr_approved: C.green,
  rejected: C.red, info_requested: C.purple, paid: C.teal,
};
const PIE_PALETTE = [C.blue, C.teal, C.green, C.amber, C.purple, C.red, C.gray];

// ── Data helpers ─────────────────────────────────────────────────────────────

function getMonthlyData(claims, n = 6) {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
    const mc = claims.filter(c => (c.createdAt || '').startsWith(key));
    return {
      month: label,
      count: mc.length,
      amount: mc.reduce((s, c) => s + (c.amount || 0), 0),
      approved: mc.filter(c => ['approved', 'ecm', 'routed', 'paid'].includes(c.status)).length,
      pending:  mc.filter(c => c.status === 'pending').length,
      rejected: mc.filter(c => c.status === 'rejected').length,
    };
  });
}

function getStatusData(claims) {
  const counts = {};
  claims.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
  return Object.entries(counts).map(([status, value]) => ({
    name: STATUS_META[status]?.label || status, value, status,
  }));
}

function getDeptData(claims) {
  const acc = {};
  claims.forEach(c => {
    const dept = (c.dept || 'Unknown').replace('GPG — ', '');
    if (!acc[dept]) acc[dept] = { dept, count: 0, amount: 0 };
    acc[dept].count++;
    acc[dept].amount += c.amount || 0;
  });
  return Object.values(acc);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GradMetric({ label, value, sub, color = C.blue }) {
  const light = color + '18';
  return (
    <div style={{
      background: `linear-gradient(135deg, ${light} 0%, #ffffff 100%)`,
      border: `0.5px solid ${color}30`,
      borderRadius: 'var(--radius-lg)', padding: '1.1rem',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -10, top: -10, width: 70, height: 70,
        borderRadius: '50%', background: color + '0D',
      }} />
      <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, height = 200, children }) {
  return (
    <Card>
      <CardTitle>{title}</CardTitle>
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </Card>
  );
}

function EmptyChart({ message }) {
  return (
    <Card>
      <div style={{ height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>
        <i className="ti ti-chart-bar" style={{ fontSize: 28, marginBottom: 8 }} />
        <p style={{ fontSize: 12 }}>{message}</p>
      </div>
    </Card>
  );
}

const ttStyle = { background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 8, fontSize: 12 };
const fmtR = v => `R ${Number(v).toFixed(0)}`;

// ── Date range filter ─────────────────────────────────────────────────────────

const DATE_RANGES = [
  { value: 'all',  label: 'All time' },
  { value: '30d',  label: 'Last 30 days' },
  { value: '3m',   label: 'Last 3 months' },
  { value: '6m',   label: 'Last 6 months' },
  { value: '12m',  label: 'Last 12 months' },
  { value: 'fy',   label: 'Financial year (Apr–Mar)' },
];

function filterByRange(claims, range) {
  if (range === 'all') return claims;
  const now = new Date();
  let from;
  if (range === '30d')  from = new Date(now - 30 * 86400e3);
  else if (range === '3m')  from = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  else if (range === '6m')  from = new Date(now.getFullYear(), now.getMonth() - 6, 1);
  else if (range === '12m') from = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  else if (range === 'fy') {
    const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    from = new Date(yr, 3, 1); // 1 April
  }
  return claims.filter(c => new Date(c.createdAt || 0) >= from);
}

function DateRangeFilter({ value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.25rem' }}>
      <i className="ti ti-calendar-stats" style={{ fontSize: 14, color: 'var(--text3)' }} />
      <span style={{ fontSize: 12, color: 'var(--text2)' }}>Period:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          padding: '3px 8px', borderRadius: 'var(--radius)',
          border: '0.5px solid var(--border2)', fontSize: 12,
          background: 'var(--surface)', color: 'var(--text)',
        }}
      >
        {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
    </div>
  );
}

// ── Workflow card ─────────────────────────────────────────────────────────────

const WORKFLOW_STEPS = [
  { role: 'Official',   action: 'Submit travel claim',              note: 'With vehicle, tariff & trip details' },
  { role: 'Supervisor', action: 'Approve',                          note: 'Verify dates, km, purpose, approved memo' },
  { role: 'Compiler',   action: 'Compile',                          note: 'Check allocation codes & Persal fields' },
  { role: 'Verifier',   action: 'Verify',                           note: 'Independent completeness check' },
  { role: 'HR Approver',action: 'HR Approve',                       note: 'Final approval before payment' },
  { role: 'HRS',        action: 'Process & mark paid on Persal',    note: 'Capture & confirm payment' },
];
const ROLE_STEPS = {
  official: [0], supervisor: [1], compiler: [2],
  verifier: [3], approver: [4], hrs: [5], admin: [],
};

function WorkflowCard({ role }) {
  const active = ROLE_STEPS[role] || [];
  return (
    <Card>
      <CardTitle>6-stage workflow</CardTitle>
      {WORKFLOW_STEPS.map((s, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: i < WORKFLOW_STEPS.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600,
            background: active.includes(i) ? C.blue : 'var(--surface2)',
            color: active.includes(i) ? '#fff' : 'var(--text3)',
          }}>{i + 1}</div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{s.role}</div>
            <div style={{ fontSize: 13, fontWeight: active.includes(i) ? 500 : 400 }}>{s.action}</div>
            <div style={{ fontSize: 11, color: 'var(--text2)' }}>{s.note}</div>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ── Welcome ───────────────────────────────────────────────────────────────────

function WelcomeBanner({ user }) {
  const h = new Date().getHours();
  const g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 20, fontWeight: 500 }}>{g}, {user?.name?.split(' ')[0] || 'there'}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>Gauteng Provincial Government — Persal Travel &amp; Subsistence</div>
    </div>
  );
}

// ── Role dashboards ───────────────────────────────────────────────────────────

function OfficialDashboard({ claims, persal, onNav }) {
  const mine    = claims.filter(c => c.persal === persal);
  const total   = mine.reduce((s, c) => s + (c.amount || 0), 0);
  const monthly = getMonthlyData(mine);
  const pieData = getStatusData(mine);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="My claims"     value={mine.length}                                         sub="All statuses"       color={C.blue} />
        <GradMetric label="Drafts"        value={mine.filter(c => c.status === 'draft').length}        sub="Not submitted"      color={C.gray} />
        <GradMetric label="Pending"       value={mine.filter(c => c.status === 'pending').length}      sub="Awaiting approval"  color={C.amber} />
        <GradMetric label="Total claimed" value={`R ${total.toFixed(0)}`}                              sub="Submitted claims"   color={C.teal} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {monthly.some(m => m.count > 0)
          ? <ChartCard title="My monthly submissions">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} formatter={v => [v, 'Claims']} />
                <Bar dataKey="count" fill={C.blue} radius={[4,4,0,0]} />
              </BarChart>
            </ChartCard>
          : <EmptyChart message="No claims yet to chart" />}

        {pieData.length > 0
          ? <ChartCard title="My claims by status">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {pieData.map((d, i) => <Cell key={i} fill={STATUS_COLOR[d.status] || PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
              </PieChart>
            </ChartCard>
          : <EmptyChart message="Submit your first claim to see status breakdown" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>Recent claims</CardTitle>
          {mine.length === 0
            ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
                <i className="ti ti-file-invoice" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
                <p style={{ fontSize: 13 }}>No claims yet. <button onClick={() => onNav('new-claim')} style={{ color: C.blue, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Submit your first →</button></p>
              </div>
            : <table><thead><tr><th>Ref</th><th>Purpose</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{mine.slice(0,6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount||0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}</tbody>
              </table>}
        </Card>
        <WorkflowCard role="official" />
      </div>
    </>
  );
}

function SupervisorDashboard({ claims }) {
  const pending  = claims.filter(c => c.status === 'pending');
  const monthly  = getMonthlyData(claims);
  const deptData = getDeptData(pending);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="Pending approval"  value={pending.length}                                       sub="In your queue"        color={C.amber} />
        <GradMetric label="Approved"          value={claims.filter(c => ['approved','ecm','routed','paid'].includes(c.status)).length} sub="Sent to HRS" color={C.green} />
        <GradMetric label="Rejected"          value={claims.filter(c => c.status === 'rejected').length}   sub="Returned"             color={C.red} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {monthly.some(m => m.count > 0)
          ? <ChartCard title="Monthly claim flow">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="pending"  fill={C.amber} radius={[3,3,0,0]} name="Pending" stackId="a" />
                <Bar dataKey="approved" fill={C.green} radius={[3,3,0,0]} name="Approved" stackId="a" />
                <Bar dataKey="rejected" fill={C.red}   radius={[3,3,0,0]} name="Rejected" stackId="a" />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ChartCard>
          : <EmptyChart message="No claim data to chart yet" />}

        {deptData.length > 0
          ? <ChartCard title="Pending claims by department">
              <BarChart data={deptData} layout="vertical" margin={{ top: 4, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 10 }} width={90} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="count" fill={C.amber} radius={[0,4,4,0]} name="Pending" />
              </BarChart>
            </ChartCard>
          : <EmptyChart message="No pending claims to break down" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>Pending approvals</CardTitle>
          {pending.length === 0
            ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}><i className="ti ti-clipboard-check" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} /><p style={{ fontSize: 13 }}>No claims waiting.</p></div>
            : <table><thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{pending.slice(0,6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td>{c.name}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount||0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}</tbody>
              </table>}
        </Card>
        <WorkflowCard role="supervisor" />
      </div>
    </>
  );
}

// Shared queue dashboard for compiler / verifier / approver
function HRChainDashboard({ claims, role }) {
  const queueStatus = { compiler: 'approved', verifier: 'compiled', approver: 'verified' }[role];
  const queue    = claims.filter(c => c.status === queueStatus);
  const rejected = claims.filter(c => c.status === 'rejected');
  const monthly  = getMonthlyData(claims);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="In my queue"   value={queue.length}    sub={`Status: ${queueStatus}`}    color={C.blue}  />
        <GradMetric label="Rejected"      value={rejected.length} sub="Returned to official"         color={C.red}   />
        <GradMetric label="Paid"          value={claims.filter(c => c.status === 'paid').length} sub="Completed" color={C.teal} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {monthly.some(m => m.count > 0)
          ? <ChartCard title="Monthly claim activity">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="count" fill={C.blue} radius={[4,4,0,0]} name="Claims" />
              </BarChart>
            </ChartCard>
          : <EmptyChart message="No claim data to chart yet" />}
        <WorkflowCard role={role} />
      </div>
      <Card>
        <CardTitle>Claims in my queue</CardTitle>
        {queue.length === 0
          ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
              <i className="ti ti-inbox" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>Queue is empty.</p>
            </div>
          : <table><thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{queue.slice(0,8).map(c => (
                <tr key={c.ref}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                  <td>{c.name}</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount||0).toFixed(2)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}</tbody>
            </table>}
      </Card>
    </>
  );
}

function HRSDashboard({ claims }) {
  const toCapture = claims.filter(c => c.status === 'hr_approved');
  const infoReq   = claims.filter(c => c.status === 'info_requested');
  const monthly   = getMonthlyData(claims);
  const stages    = [
    { name: 'HR-Approved',   value: toCapture.length, fill: C.green },
    { name: 'Info requested', value: infoReq.length,  fill: C.purple },
    { name: 'Paid',          value: claims.filter(c => c.status === 'paid').length, fill: C.teal },
  ];

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="Ready to process" value={toCapture.length}                                   sub="HR-approved claims" color={C.green} />
        <GradMetric label="Info requested"   value={infoReq.length}                                     sub="Awaiting response"  color={C.purple} />
        <GradMetric label="Paid"             value={claims.filter(c => c.status === 'paid').length}      sub="Confirmed"          color={C.teal} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        <ChartCard title="Pipeline stage counts">
          <BarChart data={stages} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={ttStyle} />
            <Bar dataKey="value" radius={[4,4,0,0]} name="Claims">
              {stages.map((s, i) => <Cell key={i} fill={s.fill} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        {monthly.some(m => m.count > 0)
          ? <ChartCard title="Monthly claim amounts">
              <LineChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R${v}`} />
                <Tooltip contentStyle={ttStyle} formatter={fmtR} />
                <Line type="monotone" dataKey="amount" stroke={C.blue} strokeWidth={2} dot={{ r: 3 }} name="Amount" />
              </LineChart>
            </ChartCard>
          : <EmptyChart message="No claim data to chart yet" />}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>Ready for payment</CardTitle>
          {toCapture.length === 0
            ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}><i className="ti ti-database" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} /><p style={{ fontSize: 13 }}>No HR-approved claims.</p></div>
            : <table><thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{toCapture.slice(0,6).map(c => (
                  <tr key={c.ref}><td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td><td>{c.name}</td><td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount||0).toFixed(2)}</td><td><StatusBadge status={c.status} /></td></tr>
                ))}</tbody>
              </table>}
        </Card>
        <WorkflowCard role="hrs" />
      </div>
    </>
  );
}

function ECMDashboard({ claims }) {
  const toRoute = claims.filter(c => c.status === 'ecm');
  const pieData = getStatusData(claims.filter(c => ['ecm','routed','paid'].includes(c.status)));
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="To route"     value={toRoute.length}                                       sub="ECM uploaded"   color={C.purple} />
        <GradMetric label="Routed"       value={claims.filter(c => c.status === 'routed').length}     sub="Sent to DMC"    color={C.blue} />
        <GradMetric label="Paid"         value={claims.filter(c => c.status === 'paid').length}       sub="Confirmed"      color={C.teal} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {pieData.length > 0
          ? <ChartCard title="Mandate status breakdown">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {pieData.map((d, i) => <Cell key={i} fill={STATUS_COLOR[d.status] || PIE_PALETTE[i]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
              </PieChart>
            </ChartCard>
          : <EmptyChart message="No ECM data to chart" />}
        <WorkflowCard role="ecm" />
      </div>
    </>
  );
}

function DMCDashboard({ claims }) {
  const toPayList = claims.filter(c => c.status === 'routed');
  const totalToPay = toPayList.reduce((s, c) => s + (c.amount || 0), 0);
  const monthly = getMonthlyData(claims.filter(c => c.status === 'paid'));
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="Ready to pay"  value={toPayList.length}                               sub="Routed mandates"  color={C.amber} />
        <GradMetric label="Run value"     value={`R ${totalToPay.toFixed(0)}`}                   sub="Total to disburse" color={C.blue} />
        <GradMetric label="Paid"          value={claims.filter(c => c.status === 'paid').length}  sub="This period"      color={C.teal} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {monthly.some(m => m.count > 0)
          ? <ChartCard title="Monthly payments">
              <BarChart data={monthly} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R${v}`} />
                <Tooltip contentStyle={ttStyle} formatter={fmtR} />
                <Bar dataKey="amount" fill={C.teal} radius={[4,4,0,0]} name="Paid" />
              </BarChart>
            </ChartCard>
          : <EmptyChart message="No payment data yet" />}
        <WorkflowCard role="dmc" />
      </div>
    </>
  );
}

function AdminDashboard({ claims }) {
  const total     = claims.reduce((s, c) => s + (c.amount || 0), 0);
  const monthly   = getMonthlyData(claims, 8);
  const statusData = getStatusData(claims);
  const deptData  = getDeptData(claims);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <GradMetric label="Total claims"   value={claims.length}                                                                               sub="All statuses"     color={C.blue} />
        <GradMetric label="In pipeline"    value={claims.filter(c => !['paid','rejected','draft'].includes(c.status)).length}                   sub="Active workflow"  color={C.amber} />
        <GradMetric label="Paid out"       value={claims.filter(c => c.status === 'paid').length}                                              sub="Confirmed"        color={C.teal} />
        <GradMetric label="Total value"    value={`R ${total.toFixed(0)}`}                                                                     sub="All claims"       color={C.green} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
        {monthly.some(m => m.count > 0)
          ? <ChartCard title="Monthly claims — count & value" height={220}>
              <BarChart data={monthly} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={v => `R${v}`} />
                <Tooltip contentStyle={ttStyle} />
                <Bar yAxisId="left" dataKey="count" fill={C.blue} radius={[4,4,0,0]} name="Claims" />
                <Line yAxisId="right" type="monotone" dataKey="amount" stroke={C.teal} strokeWidth={2} dot={{ r: 3 }} name="Value (R)" />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </BarChart>
            </ChartCard>
          : <EmptyChart message="No data to chart" />}

        {statusData.length > 0
          ? <ChartCard title="Claims by status" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="45%" outerRadius={65} dataKey="value" label={({ percent }) => `${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                  {statusData.map((d, i) => <Cell key={i} fill={STATUS_COLOR[d.status] || PIE_PALETTE[i % PIE_PALETTE.length]} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
                <Legend iconSize={9} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ChartCard>
          : <EmptyChart message="No status data" />}
      </div>

      {deptData.length > 0 && (
        <div style={{ marginBottom: '1rem' }}>
          <ChartCard title="Claims by department" height={180}>
            <BarChart data={deptData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dept" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={ttStyle} formatter={(v, n) => n === 'amount' ? fmtR(v) : v} />
              <Bar dataKey="count"  fill={C.blue}  radius={[4,4,0,0]} name="Count" />
              <Bar dataKey="amount" fill={C.teal}  radius={[4,4,0,0]} name="Amount (R)" />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
            </BarChart>
          </ChartCard>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>All claims</CardTitle>
          {claims.length === 0
            ? <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}><i className="ti ti-chart-bar" style={{ fontSize: 28, display: 'block', marginBottom: 8 }} /><p style={{ fontSize: 13 }}>No claims yet.</p></div>
            : <table><thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
                <tbody>{claims.slice(0,8).map(c => (
                  <tr key={c.ref}><td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td><td>{c.name}</td><td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount||0).toFixed(2)}</td><td><StatusBadge status={c.status} /></td></tr>
                ))}</tbody>
              </table>}
        </Card>
        <WorkflowCard role="admin" />
      </div>
    </>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function Dashboard({ claims, onNav, user }) {
  const role = user?.role;
  const [dateRange, setDateRange] = React.useState('all');
  const filtered = filterByRange(claims, dateRange);

  return (
    <div>
      <WelcomeBanner user={user} />
      <DateRangeFilter value={dateRange} onChange={setDateRange} />
      {role === 'official'   && <OfficialDashboard   claims={filtered} persal={user?.persal} onNav={onNav} />}
      {role === 'supervisor' && <SupervisorDashboard claims={filtered} />}
      {role === 'compiler'   && <HRChainDashboard    claims={filtered} role="compiler" />}
      {role === 'verifier'   && <HRChainDashboard    claims={filtered} role="verifier" />}
      {role === 'approver'   && <HRChainDashboard    claims={filtered} role="approver" />}
      {role === 'hrs'        && <HRSDashboard        claims={filtered} />}
      {role === 'admin'      && <AdminDashboard      claims={filtered} />}
    </div>
  );
}
