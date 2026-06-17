import React from 'react';
import { Card, CardTitle, Metric, StatusBadge } from './Shared';

const WORKFLOW_STEPS = [
  { role: 'Official',    action: 'Complete Persal claim form',    note: 'With all supporting documents' },
  { role: 'Official',    action: 'Submit to supervisor',           note: 'For approval and signature' },
  { role: 'Supervisor',  action: 'Approve claim',                  note: 'Verify dates, km, purpose, log sheet' },
  { role: 'HRS Payroll', action: 'Quality check & Persal capture', note: 'Compile mandate and upload to ECM' },
  { role: 'DMC Payroll', action: 'Pay on supplementary',           note: 'Verify payment confirmed on Persal' },
];

const ROLE_STEP = {
  official:   [0, 1],
  supervisor: [2],
  hrs:        [3],
  ecm:        [3],
  dmc:        [4],
  admin:      [],
};

function WelcomeBanner({ user }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ fontSize: 20, fontWeight: 500 }}>{greeting}, {user?.name?.split(' ')[0] || 'there'}</div>
      <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
        Gauteng Provincial Government — Persal Travel &amp; Subsistence
      </div>
    </div>
  );
}

function OfficialDashboard({ claims, myPersal, onNav }) {
  const mine = claims.filter(c => c.persal === myPersal);
  const total = mine.reduce((s, c) => s + (c.amount || 0), 0);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="My claims"      value={mine.length}                sub="All statuses" />
        <Metric label="Drafts"         value={mine.filter(c => c.status === 'draft').length}    sub="Not yet submitted" />
        <Metric label="Pending"        value={mine.filter(c => c.status === 'pending').length}  sub="Awaiting approval" />
        <Metric label="Total claimed"  value={`R ${total.toFixed(2)}`}    sub="Submitted claims" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>My recent claims</CardTitle>
          {mine.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
              <i className="ti ti-file-invoice" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>No claims yet. <button onClick={() => onNav('new-claim')} style={{ color: 'var(--blue)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Submit your first claim →</button></p>
            </div>
          ) : (
            <table>
              <thead><tr><th>Ref</th><th>Purpose</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {mine.slice(0, 6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.purpose}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <WorkflowCard role="official" />
      </div>
    </>
  );
}

function SupervisorDashboard({ claims }) {
  const pending = claims.filter(c => c.status === 'pending');
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="Awaiting approval"  value={pending.length}                                              sub="In your queue" />
        <Metric label="Approved this month" value={claims.filter(c => c.status !== 'pending' && c.status !== 'rejected' && c.status !== 'draft').length} sub="Sent to HRS Payroll" />
        <Metric label="Rejected"           value={claims.filter(c => c.status === 'rejected').length}          sub="Returned to official" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>Pending approvals</CardTitle>
          {pending.length === 0 ? (
            <EmptyQueue icon="clipboard-check" message="No claims waiting for your approval." />
          ) : (
            <table>
              <thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {pending.slice(0, 6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td>{c.name}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <WorkflowCard role="supervisor" />
      </div>
    </>
  );
}

function HRSDashboard({ claims }) {
  const toCapture = claims.filter(c => c.status === 'approved');
  const inEcm = claims.filter(c => c.status === 'ecm' || c.status === 'routed');
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="To capture on Persal" value={toCapture.length} sub="Approved claims" />
        <Metric label="In ECM / routing"     value={inEcm.length}     sub="Mandate uploaded" />
        <Metric label="Paid"                 value={claims.filter(c => c.status === 'paid').length} sub="Confirmed payment" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>Ready for Persal capture</CardTitle>
          {toCapture.length === 0 ? (
            <EmptyQueue icon="database" message="No approved claims waiting for capture." />
          ) : (
            <table>
              <thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {toCapture.slice(0, 6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td>{c.name}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <WorkflowCard role="hrs" />
      </div>
    </>
  );
}

function ECMDashboard({ claims }) {
  const toRoute = claims.filter(c => c.status === 'ecm');
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="Mandates to route" value={toRoute.length}                                  sub="ECM uploaded" />
        <Metric label="Routed to DMC"     value={claims.filter(c => c.status === 'routed').length} sub="Awaiting payment" />
        <Metric label="Total paid"        value={claims.filter(c => c.status === 'paid').length}   sub="Payment confirmed" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>ECM mandates to route</CardTitle>
          {toRoute.length === 0 ? (
            <EmptyQueue icon="cloud-upload" message="No mandates waiting to be routed." />
          ) : (
            <table>
              <thead><tr><th>Ref</th><th>Official</th><th>Mandate</th><th>Status</th></tr></thead>
              <tbody>
                {toRoute.slice(0, 6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td>{c.name}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.mandate || '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <WorkflowCard role="ecm" />
      </div>
    </>
  );
}

function DMCDashboard({ claims }) {
  const toPayList = claims.filter(c => c.status === 'routed');
  const totalToPay = toPayList.reduce((s, c) => s + (c.amount || 0), 0);
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="Ready to pay"   value={toPayList.length}                                sub="Routed mandates" />
        <Metric label="Total value"    value={`R ${totalToPay.toFixed(2)}`}                    sub="Payment run total" />
        <Metric label="Paid this run"  value={claims.filter(c => c.status === 'paid').length}  sub="Confirmed on Persal" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>Mandates ready for payment</CardTitle>
          {toPayList.length === 0 ? (
            <EmptyQueue icon="cash" message="No mandates ready for payment run." />
          ) : (
            <table>
              <thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {toPayList.slice(0, 6).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td>{c.name}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <WorkflowCard role="dmc" />
      </div>
    </>
  );
}

function AdminDashboard({ claims }) {
  const total = claims.reduce((s, c) => s + (c.amount || 0), 0);
  const byStatus = claims.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc; }, {});
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
        <Metric label="Total claims"    value={claims.length}             sub="All statuses" />
        <Metric label="In progress"     value={claims.filter(c => !['paid','rejected','draft'].includes(c.status)).length} sub="Active pipeline" />
        <Metric label="Paid"            value={byStatus.paid || 0}        sub="Payment confirmed" />
        <Metric label="Total value"     value={`R ${total.toFixed(2)}`}   sub="All submitted claims" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <Card>
          <CardTitle>All claims</CardTitle>
          {claims.length === 0 ? (
            <EmptyQueue icon="chart-bar" message="No claims in the system yet." />
          ) : (
            <table>
              <thead><tr><th>Ref</th><th>Official</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {claims.slice(0, 8).map(c => (
                  <tr key={c.ref}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{c.ref}</td>
                    <td>{c.name}</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>R {(c.amount || 0).toFixed(2)}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
        <WorkflowCard role="admin" />
      </div>
    </>
  );
}

function WorkflowCard({ role }) {
  const activeSteps = ROLE_STEP[role] || [];
  return (
    <Card>
      <CardTitle>Workflow — as-is process</CardTitle>
      {WORKFLOW_STEPS.map((step, i) => {
        const isActive = activeSteps.includes(i);
        return (
          <div key={i} style={{
            display: 'flex', gap: 12, padding: '10px 0',
            borderBottom: i < WORKFLOW_STEPS.length - 1 ? '0.5px solid var(--border)' : 'none',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 500,
              background: isActive ? 'var(--blue-bg)' : 'var(--surface2)',
              color: isActive ? 'var(--blue-text)' : 'var(--text3)',
              border: isActive ? '2px solid var(--blue)' : 'none',
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 2 }}>{step.role}</div>
              <div style={{ fontSize: 13, fontWeight: isActive ? 500 : 400 }}>{step.action}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 1 }}>{step.note}</div>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function EmptyQueue({ icon, message }) {
  return (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text3)' }}>
      <i className={`ti ti-${icon}`} style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
      <p style={{ fontSize: 13 }}>{message}</p>
    </div>
  );
}

export default function Dashboard({ claims, onNav, user }) {
  const role = user?.role;
  return (
    <div>
      <WelcomeBanner user={user} />
      {role === 'official'   && <OfficialDashboard   claims={claims} myPersal={user?.persal} onNav={onNav} />}
      {role === 'supervisor' && <SupervisorDashboard claims={claims} />}
      {role === 'hrs'        && <HRSDashboard        claims={claims} />}
      {role === 'ecm'        && <ECMDashboard        claims={claims} />}
      {role === 'dmc'        && <DMCDashboard        claims={claims} />}
      {role === 'admin'      && <AdminDashboard      claims={claims} />}
    </div>
  );
}
