// SLA targets per workflow stage (working days)
export const SLA_TARGETS = {
  pending:     { days: 5, label: 'Supervisor approval' },
  approved:    { days: 3, label: 'Compiler processing' },
  compiled:    { days: 2, label: 'Verifier check' },
  verified:    { days: 2, label: 'HR Approver sign-off' },
  hr_approved: { days: 5, label: 'HRS payment processing' },
};

// Count working days (Mon–Fri) elapsed since a date
export function workingDaysElapsed(fromDate) {
  if (!fromDate) return 0;
  const cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let days = 0;
  while (cur < today) {
    cur.setDate(cur.getDate() + 1);
    const d = cur.getDay();
    if (d !== 0 && d !== 6) days++;
  }
  return days;
}

// Returns null if the status has no SLA target, otherwise:
// { days, target, label, pct, status: 'ok'|'warning'|'overdue' }
export function slaStatus(claim) {
  const target = SLA_TARGETS[claim?.status];
  if (!target) return null;
  const days = workingDaysElapsed(claim.updatedAt || claim.createdAt);
  const pct  = days / target.days;
  return {
    days,
    target: target.days,
    label:  target.label,
    pct,
    status: pct > 1 ? 'overdue' : pct > 0.6 ? 'warning' : 'ok',
  };
}
